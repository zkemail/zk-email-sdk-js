import { Blueprint, Status, ZkFramework } from "./blueprint";
import { verifyProofOnChain } from "./chain";
import {
  ExternalInputProof,
  ProofProps,
  ProofResponse,
  ProofStatus,
  PublicOutputsSp1Response,
  PublicProofData,
} from "./types/proof";
import { get } from "./utils";
import { verifyProof } from "./verify";

/**
 * A generated proof. You get get proof data and verify proofs on chain.
 */
export class Proof {
  blueprint: Blueprint;
  props: ProofProps;
  private lastCheckedStatus: Date | null = null;

  constructor(blueprint: Blueprint, props: ProofProps) {
    if (!(blueprint instanceof Blueprint)) {
      throw new Error("Invalid blueprint: must be an instance of Blueprint class");
    }
    this.blueprint = blueprint;

    if (!props?.id) {
      throw new Error("A proof must have an id");
    }

    this.props = {
      status: ProofStatus.InProgress,
      ...props,
    };
  }

  getId(): string {
    return this.props.id;
  }

  getPubKeyHash(): string {
    let pubKeyHash: string;
    if (this.blueprint.props.zkFramework === ZkFramework.Circom) {
      pubKeyHash = (this.props.publicOutputs as string[])[0];
    } else if (this.blueprint.props.zkFramework === ZkFramework.Sp1) {
      pubKeyHash = new Uint8Array(
        (this.props.publicOutputs as PublicOutputsSp1Response).outputs.public_key_hash
      ).toString();
    } else {
      throw new Error(`No pubkey hash for zk framework ${this.blueprint.props.zkFramework}`);
    }
    return pubKeyHash;
  }

  /**
   * Returns a download link for the files of the proof.
   * @returns The the url to download a zip of the proof files.
   */
  async getProofDataDownloadLink(): Promise<string> {
    if (this.props.status !== ProofStatus.Done) {
      throw new Error("The proving is not done yet.");
    }

    let response: { url: string };
    try {
      response = await get<{ url: string }>(
        `${this.blueprint.baseUrl}/proof/files/${this.props.id}`
      );
    } catch (err) {
      console.error("Failed calling GET on /proof/files/:id in getProofDataDownloadLink: ", err);
      throw err;
    }

    return response.url;
  }

  async startFilesDownload() {
    if (!window && !document) {
      throw Error("startFilesDownload can only be used in a browser");
    }

    let url: string;
    try {
      url = await this.getProofDataDownloadLink();
    } catch (err) {
      console.error("Failed to start download of ZKeys: ", err);
      throw err;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = "proof_files.zip"; // Set the desired filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Checks the status of proof.
   * checkStatus can be used in a while(await checkStatus()) loop, since it will wait a fixed
   * amount of time before the second time you call it.
   * @returns A promise with the Status.
   */
  async checkStatus(): Promise<ProofStatus> {
    if (this.props.status === ProofStatus.Done) {
      return this.props.status;
    }

    // Waits for a fixed period of time before you can call checkStatus again
    // This enables you to put checkStatus in a while(await checkStatu()) loop
    if (!this.lastCheckedStatus) {
      this.lastCheckedStatus = new Date();
    } else {
      const waitTime = 2_500;
      const sinceLastChecked = new Date().getTime() - this.lastCheckedStatus.getTime();
      if (sinceLastChecked < waitTime) {
        await new Promise((r) => setTimeout(r, waitTime - sinceLastChecked));
      }
    }

    // Check status
    let response: { status: ProofStatus };
    try {
      response = await get<{ status: ProofStatus }>(
        `${this.blueprint.baseUrl}/proof/status/${this.props.id}`
      );
    } catch (err) {
      console.error("Failed calling GET /blueprint/status in getStatus(): ", err);
      throw err;
    }

    // Update the proof to its new data
    if (
      [ProofStatus.InProgress, ProofStatus.Done].includes(this.props.status!) &&
      this.props.status !== response.status
    ) {
      const newProof = await Proof.getProofById(this.props.id, this.blueprint.baseUrl);
      this.props = newProof.props;
      return this.props.status!;
    }

    this.props.status = response.status;
    return response.status;
  }

  async waitForCompletion(): Promise<ProofStatus> {
    while ((await this.checkStatus()) === ProofStatus.InProgress) {}
    return this.props.status!;
  }

  /**
   * Verifies the proof on chain using the verifier contract defined in the blueprint.
   * Will throw an error if it cannot verify the proof. If the function call succeeds,
   * the proof was validated.
   */
  async verifyOnChain() {
    await verifyProofOnChain(this);
  }

  /**
   * Generates call data for the proof that can be used to verify the proof on chain.
   */
  async createCallData() {
    if (!this.props.proofData || !this.props.publicOutputs) {
      throw new Error("No proof data generated yet");
    }

    if (this.blueprint.props.zkFramework !== ZkFramework.Circom) {
      throw new Error("createCallData only implemented for Circom proofs");
    }

    // TODO: this is parsed when getting the data from the backend,
    // add propper typing from the start
    // @ts-ignore
    const proofData = this.props.proofData as ProofData;

    return [
      [BigInt(proofData.pi_a[0]), BigInt(proofData.pi_a[1])],
      [
        [
          BigInt(proofData.pi_b[0][1]), // swap coordinates
          BigInt(proofData.pi_b[0][0]),
        ],
        [
          BigInt(proofData.pi_b[1][1]), // swap coordinates
          BigInt(proofData.pi_b[1][0]),
        ],
      ],
      [BigInt(proofData.pi_c[0]), BigInt(proofData.pi_c[1])],
      (this.props.publicOutputs as string[]).map((output) => BigInt(output)),
    ];
  }

  /**
   * Fetches an existing Proof from the database.
   * @param id - Id of the Proof.
   * @returns A promise that resolves to a new instance of Proof.
   */
  public static async getProofById(id: string, baseUrl: string): Promise<Proof> {
    let proofResponse: ProofResponse;
    try {
      proofResponse = await get<ProofResponse>(`${baseUrl}/proof/${id}`);
    } catch (err) {
      console.error("Failed calling /proof/:id in getProofById: ", err);
      throw err;
    }

    const proofProps = this.responseToProofProps(proofResponse);
    const blueprint = await Blueprint.getBlueprintById(proofResponse.blueprint_id, baseUrl);

    return new Proof(blueprint, proofProps);
  }

  public getHeaderHash(): string {
    if (this.props.status !== ProofStatus.Done) {
      throw new Error("Poof is not Done yet.");
    }

    if (this.blueprint.props.zkFramework === ZkFramework.Circom) {
      const publicOutputs = this.props.publicOutputs as string[];
      return publicOutputs[1] + publicOutputs[2];
    }

    if (this.blueprint.props.zkFramework === ZkFramework.Sp1) {
      const publicOutputs = this.props.publicOutputs as PublicOutputsSp1Response;
      return publicOutputs.outputs.from_domain_hash.toString().replaceAll(",", "");
    }

    throw new Error(`ZkFramework ${this.blueprint.props.zkFramework} not supported yet`);
  }

  public static responseToProofProps(response: ProofResponse): ProofProps {
    const props: ProofProps = {
      id: response.id,
      blueprintId: response.blueprint_id,
      status: response.status as ProofStatus,
      input: response.input,
      proofData: response.proof,
      publicData: response.public,
      publicOutputs: response.public_outputs,
      externalInputs: response.external_inputs,
      startedAt: new Date(response.started_at.seconds * 1000),
      provedAt: response.proved_at ? new Date(response.proved_at.seconds * 1000) : undefined,
      isLocal: false,
      sp1VkeyHash: response.sp1_vkey_hash,
    };
    return props;
  }

  /**
   * @returns The public data and proof data.
   */
  getProofData(): {
    proofData: string;
    publicData: PublicProofData;
    publicOutputs: string[] | PublicOutputsSp1Response;
    externalInputs: ExternalInputProof;
  } {
    if (this.props.status !== ProofStatus.Done) {
      throw new Error("Cannot get proof data, proof is not Done");
    }
    return {
      proofData: this.props.proofData!,
      publicData: this.props.publicData!,
      publicOutputs: this.props.publicOutputs!,
      externalInputs: this.props.externalInputs!,
    };
  }

  async verify(): Promise<boolean> {
    return verifyProof(this);
  }
}
