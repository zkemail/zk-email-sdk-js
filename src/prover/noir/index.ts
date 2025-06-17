import { AbstractProver, IProver } from "..";
import { Proof } from "../../proof";
import {
  DecomposedRegex,
  ExternalInputInput,
  ExternalInputProof,
  GenerateProofOptions,
  ProofStatus,
  PublicProofData,
  ZkFramework,
} from "../../types";
import {
  parseEmail,
  generateNoirCircuitInputsWithRegexesAndExternalInputs,
} from "@zk-email/relayer-utils";
import { addMaxLengthToExternalInputs } from "../../utils/maxLenghExternalInputs";

export class NoirProver extends AbstractProver implements IProver {
  async generateLocalProof(
    eml: string,
    externalInputs: ExternalInputInput[] = [],
    options?: GenerateProofOptions
  ): Promise<Proof> {
    if (!options || !options.noirWasm) {
      throw new Error("You must pass initialized noirWasm to the options");
    }

    const parsedEmail = await parseEmail(eml);

    const { Noir, UltraHonkBackend } = options.noirWasm;

    const startedAt = new Date();

    if (this.blueprint.props.externalInputs?.length && !externalInputs.length) {
      throw new Error(
        `The ${this.blueprint.props.slug} blueprint requires external inputs: ${this.blueprint.props.externalInputs}`
      );
    }

    const circuit = await this.blueprint.getNoirCircuit();
    const regexGraphs = await this.blueprint.getNoirRegexGraphs();

    const regexInputs = this.blueprint.props.decomposedRegexes.map((dr) => {
      const regexGraph = regexGraphs[`${dr.name}_regex.json`];
      if (!regexGraph) {
        throw new Error(`No regexGraph was compiled for decomposedRegexe ${dr.name}`);
      }

      const haystack =
        dr.location === "header" ? parsedEmail.canonicalizedHeader : parsedEmail.cleanedBody;

      const maxHaystackLength =
        dr.location === "header"
          ? this.blueprint.props.emailHeaderMaxLength
          : this.blueprint.props.emailBodyMaxLength;

      // TODO: switch this to new noir implementation once ready
      const maxLength = dr.parts.find(p => p.maxLength > 0)?.maxLength;
      
      return {
        name: dr.name,
        regex_graph_json: JSON.stringify(regexGraph),
        haystack,
        max_haystack_length: maxHaystackLength,
        max_match_length: maxLength,
        proving_framework: "noir",
      };
    });

    const noirParams = {
      maxHeaderLength: this.blueprint.props.emailHeaderMaxLength || 512,
      maxBodyLength: this.blueprint.props.emailBodyMaxLength || 0,
      ignoreBodyHashCheck: this.blueprint.props.ignoreBodyHashCheck || true,
      removeSoftLineBreaks: this.blueprint.props.removeSoftLinebreaks || true,
      shaPrecomputeSelector: this.blueprint.props.shaPrecomputeSelector,
      proverEthAddress: "0x0000000000000000000000000000000000000000",
    };

    console.log("generating inputs regexInputs: ", regexInputs);
    console.log("generating inputs externalInputs: ", externalInputs);
    console.log("generating inputs noirParams: ", noirParams);

    const externalInputsWithMaxLength = addMaxLengthToExternalInputs(
      externalInputs,
      this.blueprint.props.externalInputs
    );

    const circuitInputs = await generateNoirCircuitInputsWithRegexesAndExternalInputs(
      eml,
      regexInputs,
      externalInputsWithMaxLength,
      noirParams
    );

    console.log("circuitInputs: ", circuitInputs);

    if (!circuitInputs) {
      throw new Error("Could not generate circuit inputs for noir");
    }

    const compiledProgram = circuit as any;

    const noir = new Noir(compiledProgram);
    // TODO: we can use threads here, although not defining threads is the same speed
    // const backend = new UltraHonkBackend(circuit.bytecode, threads ? { threads } : {});
    const backend = new UltraHonkBackend(compiledProgram.bytecode);

    // Convert from Map to object
    const circuitInputsObject: any = {};
    for (const [key, value] of circuitInputs) {
      if (value && typeof value === "object" && value instanceof Map) {
        circuitInputsObject[key] = Object.fromEntries(value);
      } else if (value) {
        circuitInputsObject[key] = value;
      }
    }

    delete circuitInputsObject.dkim_header_sequence;

    console.time("witness");
    const { witness } = await noir.execute(circuitInputsObject);
    console.timeEnd("witness");

    console.time("prove");
    const proof = await backend.generateProof(witness);
    console.timeEnd("prove");

    this.incNumLocalProofs().catch((err) =>
      console.warn("Failed to increase num of local proofs: ", err)
    );

    const { publicData, externalInputsProof } = parseNoirPublicOutputs(
      proof.publicInputs,
      this.blueprint.props.decomposedRegexes,
      externalInputsWithMaxLength
    );

    // Convert to hex
    const strProof = Array.from(proof.proof)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return new Proof(this.blueprint, {
      id: crypto.randomUUID(),
      blueprintId: this.blueprint.props.id!,
      input: JSON.stringify(circuitInputsObject),
      proofData: strProof,
      publicOutputs: proof.publicInputs,
      publicData,
      isLocal: true,
      startedAt,
      provedAt: new Date(),
      zkFramework: ZkFramework.Noir,
      status: ProofStatus.Done,
      externalInputs: externalInputsProof,
    });
  }
}

// external inputs first
export function parseNoirPublicOutputs(
  publicOutputs: string[],
  decomposedRegexes: DecomposedRegex[],
  externalInputs?: ExternalInputInput[]
): { publicData: PublicProofData; externalInputsProof?: ExternalInputProof } {
  // 0: pubkey hash
  // 1: header_hash[0]
  // 2: header_hash[1]
  // 3: prover_address
  let publicOutputIterator = 4;

  const parsedExternalInputs = {};

  const publicStruct: { [key: string]: string[] } = {};
  const result: { publicData: PublicProofData; externalInputsProof?: ExternalInputProof } = {
    publicData: publicStruct,
  };

  if (externalInputs) {
    result.externalInputsProof = {};
    externalInputs.forEach((externalInput) => {
      const signalLength =
        Math.floor(externalInput.maxLength / 31) + (externalInput.maxLength % 31 !== 0 ? 1 : 0);
      publicOutputIterator += signalLength;
      result.externalInputsProof![externalInput.name] = externalInput.value;
    });
  }

  decomposedRegexes.forEach((decomposedRegex) => {
    const partOutputs: string[] = [];

    const { maxLength } = decomposedRegex;
    decomposedRegex.parts.forEach((part) => {
      if (decomposedRegex.isHashed) {
        partOutputs.push(publicOutputs[publicOutputIterator]);
        publicOutputIterator++;
      } else if (part.isPublic) {
        let partStr = "";
        for (let i = publicOutputIterator; i < publicOutputIterator + maxLength; i++) {
          const char = toUtf8(publicOutputs[i]);
          partStr += char;
        }
        partOutputs.push(partStr);
        publicOutputIterator += maxLength;
        // The next element is the length of the part
        const partLength = parseInt(publicOutputs[publicOutputIterator], 16);
        if (partStr.length !== partLength) {
          throw new Error("Length of part didn't match the given length output");
        }
        publicOutputIterator++;
      }
    });

    // Collect all part outputs for this decomposedRegex
    publicStruct[decomposedRegex.name] = partOutputs;
  });

  return result;
}

function toUtf8(hex: string): string {
  // Remove '0x' prefix and leading zeros
  const cleanHex = hex.slice(2).replace(/^0+/, "");

  // Convert the hex to a Uint8Array
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }

  // Use TextDecoder to convert to UTF-8
  return new TextDecoder().decode(bytes);
}
