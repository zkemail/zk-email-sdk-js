import { Blueprint } from "./blueprint";
import { Proof } from "./proof";
import { generateProofInputs, parsePublicSignals, testBlueprint } from "./relayerUtils";
import {
  ExternalInputProof,
  GenerateProofInputsParams,
  ProofProps,
  ProofRequest,
  ProofResponse,
  ProofStatus,
} from "./types/proof";
import { ExternalInputInput, ProverOptions } from "./types/prover";
import { patch, post } from "./utils";
import { localProverWorkerCode } from "./localProverWorkerString";

/**
 * Represents a Prover generated from a blueprint that can generate Proofs
 */
export class Prover {
  options: ProverOptions;
  blueprint: Blueprint;

  constructor(blueprint: Blueprint, options?: ProverOptions) {
    if (!(blueprint instanceof Blueprint)) {
      throw new Error("Invalid blueprint: must be an instance of Blueprint class");
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
  async generateProof(eml: string, externalInputs: ExternalInputInput[] = []): Promise<Proof> {
    if (this.options.isLocal) {
      return this.generateLocalProof(eml, externalInputs);
    } else {
      const proof = await this.generateProofRequest(eml, externalInputs);

      // Wait for proof to finish
      while (![ProofStatus.Done, ProofStatus.Failed].includes(await proof.checkStatus())) {}
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
      console.log("generating proof inputs");
      inputs = await generateProofInputs(
        eml,
        this.blueprint.props.decomposedRegexes,
        externalInputs,
        params
      );
    } catch (err) {
      console.error("Failed to generate inputs for proof");
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
    externalInputs: ExternalInputInput[] = []
  ): Promise<Proof> {
    const blueprintId = this.blueprint.getId();
    if (!blueprintId) {
      throw new Error("Blueprint of Proover must be initialized in order to create a Proof");
    }

    const inputs = await this.generateProofInputs(eml, externalInputs);

    let response: ProofResponse;
    try {
      const requestData: ProofRequest = {
        blueprint_id: blueprintId,
        input: JSON.parse(inputs),
        external_inputs: externalInputs.reduce(
          (acc, input) => ({
            ...acc,
            [input.name]: input.value,
          }),
          {}
        ),
      };

      response = await post<ProofResponse>(`${this.blueprint.baseUrl}/proof`, requestData);
    } catch (err) {
      console.error("Failed calling POST on /proof/ in generateProofRequest: ", err);
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
  async generateLocalProof(eml: string, externalInputs: ExternalInputInput[] = []): Promise<Proof> {
    const blueprintId = this.blueprint.getId();
    if (!blueprintId) {
      throw new Error("Blueprint of Proover must be initialized in order to create a Proof");
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
            console.log(`Progress: ${message}`);
            break;
          case "message":
            console.log(message);
            break;
          case "result":
            message.publicData = publicData;
            resolve(message as { proof: string; publicSignals: string[]; publicData: string });
            break;
          case "error":
            console.error("Error in worker:", error);
            reject(error);
            break;
        }
      };

      worker.postMessage({
        chunkedZkeyUrls,
        inputs,
        wasmUrl,
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
    this._incNumLocalProofs().catch((err) => {
      console.error("Failed to increase local proofs after generating proof");
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
      isLocal: false,
    };

    return new Proof(this.blueprint, proofProps);
  }

  private async _incNumLocalProofs(): Promise<void> {
    try {
      await patch<{ success: boolean }>(
        `${this.blueprint.baseUrl}/blueprint/inc-local-proofs/${this.blueprint.props.id}`
      );
    } catch (err) {
      console.error(
        "Failed calling PATCH on /blueprint/inc-local-proofs in _incNumLocalProofs: ",
        err
      );
      throw err;
    }
  }
}
