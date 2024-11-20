import { Blueprint, Status } from "./blueprint";
import { ProofProps, ProofResponse, ProofStatus } from "./types/proof";
import { get } from "./utils";

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
      const waitTime = 500;
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

  async verifyOnChain() {}

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

  public static responseToProofProps(response: ProofResponse): ProofProps {
    const props: ProofProps = {
      id: response.id,
      blueprintId: response.blueprint_id,
      status: response.status as ProofStatus,
      input: response.input,
      proofData: response.proof,
      publicData: response.public,
      startedAt: new Date(response.started_at.seconds * 1000),
      provedAt: response.proved_at ? new Date(response.proved_at.seconds * 1000) : undefined,
    };
    return props;
  }

  /**
   * @returns The public data and proof data.
   */
  getProofData(): { proofData: string; publicData: string } {
    if (this.props.status !== ProofStatus.Done) {
      throw new Error("Cannot get proof data, proof is not Done");
    }
    return { proofData: this.props.proofData!, publicData: this.props.publicData! };
  }
}
