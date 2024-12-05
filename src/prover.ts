import { Blueprint, ExternalInput } from "./blueprint";
import { Proof } from "./proof";
import {
  GenerateProofInputsParams,
  ProofProps,
  ProofRequest,
  ProofResponse,
  ProofStatus,
} from "./types/proof";
import { ExternalInputInput, ProverOptions } from "./types/prover";
import { generateProofInputs, post } from "./utils";

/**
 * Represents a Prover generated from a blueprint that can generate Proofs
 */
export class Prover {
  options: ProverOptions;
  blueprint: Blueprint;

  constructor(blueprint: Blueprint, options?: ProverOptions) {
    if (options?.isLocal === true) {
      throw new Error("Local proving is not supported yet");
    }

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
    const proof = await this.generateProofRequest(eml, externalInputs);

    // Wait for proof to finish
    while (![ProofStatus.Done, ProofStatus.Failed].includes(await proof.checkStatus())) {}
    return proof;
  }

  // TODO: Add parsed email input
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

    if (this.blueprint.props.externalInputs?.length && !externalInputs.length) {
      throw new Error(
        `The ${this.blueprint.props.slug} blueprint requires external inputs: ${this.blueprint.props.externalInputs}`
      );
    }

    let input: string;
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
      input = await generateProofInputs(
        eml,
        this.blueprint.props.decomposedRegexes,
        externalInputs,
        params
      );
    } catch (err) {
      console.error("Failed to generate inputs for proof");
      throw err;
    }

    console.log("got proof input");
    let response: ProofResponse;
    try {
      const requestData: ProofRequest = {
        blueprint_id: blueprintId,
        input: JSON.parse(input),
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
}
