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
import { canonicalPublicOutputs, decodeNoirRegexOutputs } from "../../utils/publicOutputs";

export class NoirProver extends AbstractProver implements IProver {
  /**
   * Detect RSA key size from parsed email public key
   * @param parsedEmail - Parsed email object
   * @returns 1024 or 2048
   * @throws Error if key size is not 1024 or 2048 bits
   */
  private detectKeySize(parsedEmail: { publicKey: Uint8Array }): 1024 | 2048 {
    // Public key bytes: 128 bytes = 1024 bits, 256 bytes = 2048 bits
    const keyBytes = parsedEmail.publicKey.length;
    if (keyBytes !== 128 && keyBytes !== 256) {
      throw new Error(
        `Unsupported RSA key size: ${keyBytes * 8} bits. Only 1024-bit and 2048-bit keys are supported.`
      );
    }
    return keyBytes <= 128 ? 1024 : 2048;
  }

  async generateLocalProof(
    eml: string,
    externalInputs: ExternalInputInput[] = [],
    options?: GenerateProofOptions
  ): Promise<Proof> {
    if (!options || !options.noirWasm) {
      throw new Error("You must pass initialized noirWasm to the options");
    }

    const parsedEmail = await parseEmail(eml);

    // Detect key size from the email
    const keyBits = this.detectKeySize(parsedEmail);
    logger.info(`Detected RSA key size: ${keyBits} bits`);

    const { Noir, UltraHonkBackend } = options.noirWasm;

    const startedAt = new Date();

    if (this.blueprint.props.externalInputs?.length && !externalInputs.length) {
      throw new Error(
        `The ${this.blueprint.props.slug} blueprint requires external inputs: ${this.blueprint.props.externalInputs}`
      );
    }

    // Fetch the appropriate circuit based on detected key size
    const circuit = await this.blueprint.getNoirCircuit(keyBits);
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
          ...(p.isPublic && { maxLength: p.maxLength || !!p.max_length }),
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
      rsaKeyBits: keyBits, // Pass key size to relayer-utils
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
      } else if (value !== undefined && value !== null) {
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
    const proof = await backend.generateProof(witness, { keccak: true });
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
      dkimKeyBits: keyBits,
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
  // 1: email_nullifier
  // 2: header_hash[0]
  // 3: header_hash[1]
  // 4: prover_address
  let publicOutputIterator = 5;

  const result: { publicData: PublicProofData; externalInputsProof?: ExternalInputProof } = {
    publicData: {},
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

  // REASON: decode the canonical spelling of each output, by each part's committed length
  // (see utils/publicOutputs.ts); verifyProof decodes the same way to check publicData.
  result.publicData = decodeNoirRegexOutputs(
    canonicalPublicOutputs(publicOutputs, "hex"),
    decomposedRegexes,
    publicOutputIterator
  );

  return result;
}
