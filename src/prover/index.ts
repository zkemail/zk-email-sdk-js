import { Blueprint, ZkFramework } from "../blueprint";
import { Proof } from "../proof";
import { generateProofInputs, parsePublicSignals } from "../relayerUtils";
import {
  ExternalInputProof,
  GenerateProofInputsParams,
  ProofProps,
  ProofRequest,
  ProofResponse,
  ProofStatus,
} from "../types/proof";
import { ExternalInputInput, GenerateProofOptions, ProverOptions } from "../types/prover";
import { patch, post } from "../utils";
import { localProverWorkerCode } from "../localProverWorkerString";
import { addMaxLengthToExternalInputs } from "../utils/maxLenghExternalInputs";
import { logger } from "../utils/logger";

export interface IProver {
  options: ProverOptions;
  blueprint: Blueprint;

  generateProof(
    eml: string,
    externalInputs?: ExternalInputInput[],
    options?: GenerateProofOptions
  ): Promise<Proof>;
  generateProofInputs(eml: string, externalInputs?: ExternalInputInput[]): Promise<string>;
  generateProofRequest(
    eml: string,
    externalInputs?: ExternalInputInput[],
    options?: GenerateProofOptions
  ): Promise<Proof>;
  generateLocalProof(
    eml: string,
    externalInputs?: ExternalInputInput[],
    options?: GenerateProofOptions
  ): Promise<Proof>;
  incNumLocalProofs(): Promise<void>;
}

/**
 * Abstract base class for Provers
 */
export abstract class AbstractProver implements IProver {
  options: ProverOptions;
  blueprint: Blueprint;

  constructor(blueprint: Blueprint, options?: ProverOptions) {
    if (!(blueprint instanceof Blueprint)) {
      throw new Error("Invalid blueprint: must be an instance of Blueprint class");
    }
    logger.debug("blueprint.props.clientZkFramework!: ", blueprint.props.clientZkFramework!);
    if (
      options?.isLocal &&
      ![ZkFramework.Circom, ZkFramework.Noir].includes(blueprint.props.clientZkFramework!)
    ) {
      throw new Error("Local proving is currently only supported using Circom");
    }

    this.blueprint = blueprint;

    // Use defaults for unset fields
    this.options = {
      isLocal: false,
      ...(!!options ? options : {}),
    };
  }

  // TODO: Add parsed email input
  /**
   * Generates a proof for a given email.
   * @param eml - Email to prove agains the blueprint of this Prover.
   * @returns A promise that resolves to a new instance of Proof. The Proof will have the status
   * Done or Failed.
   */
  async generateProof(
    eml: string,
    externalInputs: ExternalInputInput[] = [],
    options?: GenerateProofOptions
  ): Promise<Proof> {
    if (this.options.isLocal) {
      return this.generateLocalProof(eml, externalInputs, options);
    } else {
      const proof = await this.generateProofRequest(eml, externalInputs, options);

      await new Promise((r) => setTimeout(r, 6_000));

      // Wait for proof to finish
      while (![ProofStatus.Done, ProofStatus.Failed].includes(await proof.checkStatus())) {}
      const status = await proof.checkStatus();
      if (status === ProofStatus.Failed) {
        throw new Error("Remote proving failed");
      }
      return proof;
    }
  }

  /**
   * Generates inputs needed to generate a proof
   * @param eml - Email to prove agains the blueprint of this Prover.
   * @returns A promise that resolves to the inputs.
   */
  async generateProofInputs(
    eml: string,
    externalInputs: ExternalInputInput[] = []
  ): Promise<string> {
    const blueprintId = this.blueprint.getId();
    if (!blueprintId) {
      throw new Error("Blueprint of Proover must be initialized in order to create a Proof");
    }

    if (this.blueprint.props.externalInputs?.length && !externalInputs.length) {
      throw new Error(
        `The ${this.blueprint.props.slug} blueprint requires external inputs: ${this.blueprint.props.externalInputs}`
      );
    }

    const externalInputsWithMaxLength = addMaxLengthToExternalInputs(
      externalInputs,
      this.blueprint.props.externalInputs
    );

    let inputs: string;
    try {
      // TODO: Do we use defaults?
      const params: GenerateProofInputsParams = {
        emailHeaderMaxLength: this.blueprint.props.emailHeaderMaxLength || 256,
        emailBodyMaxLength: this.blueprint.props.emailBodyMaxLength || 2560,
        ignoreBodyHashCheck: this.blueprint.props.ignoreBodyHashCheck || false,
        removeSoftLinebreaks: this.blueprint.props.removeSoftLinebreaks || true,
        shaPrecomputeSelector: this.blueprint.props.shaPrecomputeSelector,
      };
      inputs = await generateProofInputs(
        eml,
        this.blueprint.props.decomposedRegexes,
        externalInputsWithMaxLength,
        params
      );

      logger.debug("got proof inputs: ", inputs);
    } catch (err) {
      logger.error("Failed to generate inputs for proof");
      throw err;
    }

    return inputs;
  }

  /**
   * Starts proving for a given email.
   * @param eml - Email to prove agains the blueprint of this Prover.
   * @returns A promise that resolves to a new instance of Proof. The Proof will have the status
   * InProgress.
   */
  async generateProofRequest(
    eml: string,
    externalInputs: ExternalInputInput[] = [],
    options?: GenerateProofOptions
  ): Promise<Proof> {
    logger.info("generating remote proof");
    const blueprintId = this.blueprint.getId();
    if (!blueprintId) {
      throw new Error("Blueprint of Proover must be initialized in order to create a Proof");
    }

    if (!this.blueprint.props.serverZkFramework) {
      throw new Error("This blueprint has no remote ZkFramework set up");
    }

    let response: ProofResponse;
    try {
      const requestData: ProofRequest = {
        blueprint_id: blueprintId,
        external_inputs: externalInputs.reduce(
          (acc, input) => ({
            ...acc,
            [input.name]: input.value,
          }),
          {}
        ),
        zk_framework: this.blueprint.props.serverZkFramework,
      };

      if (this.blueprint.props.serverZkFramework === ZkFramework.Circom) {
        const inputs = await this.generateProofInputs(eml, externalInputs);
        requestData.input = JSON.parse(inputs);
      }

      if (this.blueprint.props.serverZkFramework === ZkFramework.Sp1) {
        requestData.eml = eml;
      }

      // @ts-ignore
      delete requestData.zk_framework;

      response = await post<ProofResponse>(`${this.blueprint.baseUrl}/proof`, requestData);
    } catch (err) {
      logger.error("Failed calling POST on /proof/ in generateProofRequest: ", err);
      throw err;
    }

    const proofProps = Proof.responseToProofProps(response);

    return new Proof(this.blueprint, proofProps);
  }

  /**
   * Starts proving locally for a given email.
   * @param eml - Email to prove agains the blueprint of this Prover.
   * @returns A promise that resolves to a new instance of Proof. The Proof will have the status
   * Done or Failed.
   */
  async generateLocalProof(
    eml: string,
    externalInputs: ExternalInputInput[] = [],
    options?: GenerateProofOptions
  ): Promise<Proof> {
    logger.debug("in general generateLocalProof: ", options);
    const blueprintId = this.blueprint.getId();
    if (!blueprintId) {
      throw new Error("Blueprint of Proover must be initialized in order to create a Proof");
    }

    if (!this.blueprint.props.clientZkFramework) {
      throw new Error("Blueprint has no client side proving setup");
    }

    const startTime = new Date();
    const inputs = await this.generateProofInputs(eml, externalInputs);

    const [chunkedZkeyUrls, wasmUrl] = await Promise.all([
      this.blueprint.getChunkedZkeyDownloadLinks(),
      this.blueprint.getWasmFileDownloadLink(),
    ]);

    const blob = new Blob([localProverWorkerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const { proof, publicSignals } = await new Promise<{
      proof: string;
      publicSignals: string[];
      publicData: string;
    }>(async (resolve, reject) => {
      let publicData = "";

      worker.onmessage = (event) => {
        const { type, message, error } = event.data;
        switch (type) {
          case "progress":
            logger.info(`Progress: ${message}`);
            break;
          case "message":
            logger.info(message);
            break;
          case "result":
            message.publicData = publicData;
            resolve(message as { proof: string; publicSignals: string[]; publicData: string });
            break;
          case "error":
            logger.error("Error in worker:", error);
            reject(error);
            break;
        }
      };

      worker.postMessage({
        chunkedZkeyUrls,
        inputs,
        wasmUrl,
        loggingConfig: logger.getConfig()
      });
    });

    const proofExternalInputs: ExternalInputProof = externalInputs.reduce(
      (acc: ExternalInputProof, cur) => {
        acc[cur.name] = cur.value;
        return acc;
      },
      {}
    );

    // Do not await, local proof should not fail if this fails
    this.incNumLocalProofs().catch((err) => {
      logger.error("Failed to increase local proofs after generating proof: ", err);
    });

    const proofProps: ProofProps = {
      id: "id-" + Math.random().toString(36).substring(2, 9),
      blueprintId: this.blueprint.props.id!,
      input: inputs,
      proofData: proof,
      publicData: parsePublicSignals(publicSignals, this.blueprint.props.decomposedRegexes),
      publicOutputs: publicSignals,
      externalInputs: proofExternalInputs,
      status: ProofStatus.Done,
      startedAt: startTime,
      provedAt: new Date(),
      isLocal: true,
      zkFramework: this.blueprint.props.clientZkFramework,
    };

    return new Proof(this.blueprint, proofProps);
  }

  async incNumLocalProofs(): Promise<void> {
    try {
      await patch<{ success: boolean }>(
        `${this.blueprint.baseUrl}/blueprint/inc-local-proofs/${this.blueprint.props.id}`
      );
    } catch (err) {
      logger.error(
        "Failed calling PATCH on /blueprint/inc-local-proofs in incNumLocalProofs: ",
        err
      );
      throw err;
    }
  }
}

/**
 * Represents a Prover generated from a blueprint that can generate Proofs
 */
export class Prover extends AbstractProver {}
