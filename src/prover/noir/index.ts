import { AbstractProver, IProver } from "..";
import { Proof } from "../../proof";
import {
  DecomposedRegex,
  ExternalInput,
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
import { logger } from "../../utils/logger";

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

      // const haystack =
      //   dr.location === "header" ? parsedEmail.canonicalizedHeader : parsedEmail.cleanedBody;

      let haystack;
      if (dr.location === "header") {
        haystack = parsedEmail.canonicalizedHeader;
      } else if (this.blueprint.props.shaPrecomputeSelector) {
        haystack = parsedEmail.cleanedBody.split(this.blueprint.props.shaPrecomputeSelector)[1];
      } else {
        haystack = parsedEmail.cleanedBody;
      }
      
      let haystack_location;
      if (dr.location === "header") {
        haystack_location = "Header";
      } else {
        haystack_location = "Body";
      }

      const maxHaystackLength =
        dr.location === "header"
          ? this.blueprint.props.emailHeaderMaxLength
          : this.blueprint.props.emailBodyMaxLength;

      return {
        name: dr.name,
        regex_graph_json: JSON.stringify(regexGraph),
        haystack_location,
        max_haystack_length: maxHaystackLength,
        max_match_length: dr.maxMatchLength || dr.maxLength,
        parts: dr.parts.map((p) => ({
          // @ts-ignore
          is_public: p.isPublic || !!p.is_public,
          // @ts-ignore
          regex_def: p.regexDef || !!p.regex_def,
          // @ts-ignore
          ...(p.isPublic && { maxLength:  p.maxLength || !!p.max_length }),         
        })),
        proving_framework: "noir",
      };
    });

    const noirParams = {
      maxHeaderLength: this.blueprint.props.emailHeaderMaxLength || 512,
      maxBodyLength: this.blueprint.props.emailBodyMaxLength || 0,
      ignoreBodyHashCheck: this.blueprint.props.ignoreBodyHashCheck,
      removeSoftLineBreaks: this.blueprint.props.removeSoftLinebreaks,
      shaPrecomputeSelector: this.blueprint.props.shaPrecomputeSelector,
      proverEthAddress: "0x0000000000000000000000000000000000000000",
    };

    logger.info("generating inputs regexInputs: ", regexInputs);
    logger.info("generating inputs externalInputs: ", externalInputs);
    logger.info("generating inputs noirParams: ", noirParams);

    const externalInputsWithMaxLength = addMaxLengthToExternalInputs(
      externalInputs,
      this.blueprint.props.externalInputs
    );

    console.log("externalInputsWithMaxLength: ", externalInputsWithMaxLength);

    const circuitInputs = await generateNoirCircuitInputsWithRegexesAndExternalInputs(
      eml,
      regexInputs,
      externalInputsWithMaxLength,
      noirParams
    );
    console.log("circuitInputs: ", circuitInputs);

    logger.debug("circuitInputs: ", circuitInputs);

    if (!circuitInputs) {
      throw new Error("Could not generate circuit inputs for noir");
    }

    const compiledProgram = circuit as any;

    console.log("new noir");
    const noir = new Noir(compiledProgram);
    console.log("got new noir");
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

    console.log("circuitInputsObject: ", circuitInputsObject);
    // delete circuitInputsObject.dkim_header_sequence;

    logger.time("witness");
    console.log("getting noir");
    const { witness } = await noir.execute(circuitInputsObject);
    logger.timeEnd("witness");

    logger.time("prove");
    const proof = await backend.generateProof(witness);
    logger.timeEnd("prove");

    this.incNumLocalProofs().catch((err) =>
      logger.warn("Failed to increase num of local proofs: ", err)
    );

    const { publicData, externalInputsProof } = parseNoirPublicOutputs(
      proof.publicInputs,
      this.blueprint.props.decomposedRegexes,
      this.blueprint.props.externalInputs,
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
  externalInputDefinition?: ExternalInput[],
  externalInputs?: ExternalInputInput[]
): { publicData: PublicProofData; externalInputsProof?: ExternalInputProof } {
  // 0: pubkey hash
  // 1: header_hash[0]
  // 2: header_hash[1]
  // 3: prover_address
  let publicOutputIterator = 4;

  const publicStruct: { [key: string]: string[] } = {};
  const result: { publicData: PublicProofData; externalInputsProof?: ExternalInputProof } = {
    publicData: publicStruct,
  };

  if (externalInputs) {
    const externalInputsWithMaxLength = addMaxLengthToExternalInputs(
      externalInputs,
      externalInputDefinition
    );

    result.externalInputsProof = {};
    externalInputsWithMaxLength.forEach((externalInput) => {
      const signalLength =
        Math.floor(externalInput.maxLength / 31) + (externalInput.maxLength % 31 !== 0 ? 1 : 0);
      publicOutputIterator += signalLength;
      result.externalInputsProof![externalInput.name] = externalInput.value;
    });
  }

  decomposedRegexes.forEach((decomposedRegex) => {
    const partOutputs: string[] = [];

    const { maxMatchLength } = decomposedRegex;
    decomposedRegex.parts.forEach((part) => {
      if (decomposedRegex.isHashed) {
        partOutputs.push(publicOutputs[publicOutputIterator]);
        publicOutputIterator++;
      } else if (part.isPublic) {
        // Use part's maxLength if available, otherwise fall back to decomposedRegex's maxMatchLength
        const partMaxLength = part.maxLength ?? maxMatchLength;
        if (!partMaxLength) {
          throw new Error(`No maxLength found for public part. Either part.maxLength or decomposedRegex.maxMatchLength must be defined`);
        }
        
        let partStr = "";
        for (let i = publicOutputIterator; i < publicOutputIterator + partMaxLength; i++) {
          const char = toUtf8(publicOutputs[i]);
          partStr += char;
        }
        partOutputs.push(partStr);
        publicOutputIterator += partMaxLength;
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
