import { Prover } from "./prover";
import {
  BlueprintProps,
  BlueprintRequest,
  BlueprintResponse,
  ChunkedZkeyUrl,
  DownloadUrls,
  ListBlueprintsOptions,
  Status,
  ZkFramework,
} from "./types/blueprint";
import { del, get, patch, post, verifyPubKey } from "./utils";
import { verifyProofOnChain } from "./chain";
import { Auth } from "./types/auth";
import { Proof } from "./proof";
import { blueprintFormSchema } from "./blueprintValidation";
import { ProverOptions } from "./types";
import { getMaxEmailBodyLength, testBlueprint } from "./relayerUtils";
import * as snarkjs from "@zk-email/snarkjs";
import { verifyProof, verifyProofData } from "./verify";

/**
 * Represents a Regex Blueprint including the decomposed regex access to the circuit.
 */
export class Blueprint {
  // TODO: Implement getter and setter pattern
  props: BlueprintProps;
  auth?: Auth;
  baseUrl: string;
  stars = 0;

  public static readonly formSchema: typeof blueprintFormSchema = blueprintFormSchema;

  private lastCheckedStatus: Date | null = null;

  constructor(props: BlueprintProps, baseUrl: string, auth?: Auth) {
    // Use defaults for unset fields
    this.props = {
      ignoreBodyHashCheck: false,
      enableHeaderMasking: false,
      enableBodyMasking: false,
      isPublic: true,
      status: Status.Draft,
      ...props,
    };

    this.baseUrl = baseUrl;
    this.auth = auth;
  }

  addAuth(auth: Auth) {
    this.auth = auth;
  }

  /**
   * Fetches an existing RegexBlueprint from the database.
   * @param {string} id - Id of the RegexBlueprint.
   * @returns A promise that resolves to a new instance of RegexBlueprint.
   */
  public static async getBlueprintById(
    id: string,
    baseUrl: string,
    auth?: Auth
  ): Promise<Blueprint> {
    console.log("getting blueprint by id");
    let blueprintResponse: BlueprintResponse;
    try {
      blueprintResponse = await get<BlueprintResponse>(`${baseUrl}/blueprint/${id}`);
    } catch (err) {
      console.error("Failed calling /blueprint/:id in getBlueprintById: ", err);
      throw err;
    }

    const blueprintProps = this.responseToBlueprintProps(blueprintResponse);

    const blueprint = new Blueprint(blueprintProps, baseUrl, auth);

    return blueprint;
  }

  /**
   * Fetches an existing RegexBlueprint by slug from the database.
   * @param slug - Slug of the blueprint. Must include version, e.g. "slug:v1"
   * @param version - Version of the slug.
   * @returns A promise that resolves to a new instance of RegexBlueprint.
   */
  public static async getBlueprintBySlug(
    slug: string,
    baseUrl: string,
    auth?: Auth
  ): Promise<Blueprint> {
    const parts = slug.split("@");

    if (!parts || !(parts.length > 1)) {
      throw new Error("You must provide the blueprint version, e.g. 'user/slug@v1");
    }
    const version = parts.pop()!.replace("v", "");

    slug = encodeURIComponent(parts.join(""));

    if (!version) {
      throw new Error("You must provide the blueprint version, e.g. 'user/slug@v1");
    }

    let blueprintResponse: BlueprintResponse;
    try {
      const url = `${baseUrl}/blueprint/by-slug/${slug}/${version}`;
      blueprintResponse = await get<BlueprintResponse>(url);
    } catch (err) {
      console.error("Failed calling /blueprint/by-slug/:slug/:id in getBlueprintById: ", err);
      throw err;
    }

    const blueprintProps = this.responseToBlueprintProps(blueprintResponse);

    const blueprint = new Blueprint(blueprintProps, baseUrl, auth);

    return blueprint;
  }

  // Maps the blueprint API response to the BlueprintProps
  private static responseToBlueprintProps(response: BlueprintResponse): BlueprintProps {
    const props: BlueprintProps = {
      id: response.id,
      title: response.title,
      description: response.description,
      slug: response.slug,
      tags: response.tags,
      emailQuery: response.email_query,
      circuitName: response.circuit_name,
      ignoreBodyHashCheck: response.ignore_body_hash_check,
      shaPrecomputeSelector: response.sha_precompute_selector,
      emailBodyMaxLength: response.email_body_max_length,
      emailHeaderMaxLength: response.email_header_max_length,
      removeSoftLinebreaks: response.remove_soft_linebreaks,
      githubUsername: response.github_username,
      senderDomain: response.sender_domain,
      enableHeaderMasking: response.enable_header_masking,
      enableBodyMasking: response.enable_body_masking,
      zkFramework: (response.zk_framework as ZkFramework) || ZkFramework.Circom,
      isPublic: response.is_public,
      createdAt: new Date(response.created_at.seconds * 1000),
      updatedAt: new Date(response.updated_at.seconds * 1000),
      externalInputs: response.external_inputs?.map((input) => ({
        name: input.name,
        maxLength: input.max_length,
      })),
      decomposedRegexes: response.decomposed_regexes?.map((regex) => ({
        parts: (regex?.parts || []).map((part) => ({
          isPublic: part.is_public,
          regexDef: part.regex_def,
        })),
        name: regex.name,
        maxLength: regex.max_length,
        isHashed: regex.is_hashed,
        location: regex.location,
      })),
      status: response.status as Status,
      verifierContract: {
        address: response.verifier_contract_address,
        chain: response.verifier_contract_chain,
      },
      version: response.version,
      stars: response.stars,
      numLocalProofs: response.num_local_proofs,
    };

    return props;
  }

  // Maps the BlueprintProps to the BlueprintResponse
  private static blueprintPropsToRequest(props: BlueprintProps): BlueprintRequest {
    const response: BlueprintRequest = {
      id: props.id,
      title: props.title,
      description: props.description,
      slug: props.slug,
      tags: props.tags,
      email_query: props.emailQuery,
      circuit_name: props.circuitName,
      ignore_body_hash_check: props.ignoreBodyHashCheck,
      sha_precompute_selector: props.shaPrecomputeSelector,
      email_body_max_length: props.emailBodyMaxLength,
      email_header_max_length: props.emailHeaderMaxLength,
      remove_soft_linebreaks: props.removeSoftLinebreaks,
      github_username: props.githubUsername,
      sender_domain: props.senderDomain,
      enable_header_masking: props.enableHeaderMasking,
      enable_body_masking: props.enableBodyMasking,
      zk_framework: props.zkFramework,
      is_public: props.isPublic,
      external_inputs: props.externalInputs?.map((input) => ({
        name: input.name,
        max_length: input.maxLength,
      })),
      decomposed_regexes: props.decomposedRegexes?.map((regex) => ({
        parts: (regex?.parts || []).map((part) => ({
          // @ts-ignore
          is_public: part.isPublic || part.is_public,
          // @ts-ignore
          regex_def: part.regexDef || part.regex_def,
        })),
        name: regex.name,
        max_length: regex.maxLength,
        is_hashed: regex.isHashed,
        location: regex.location,
      })),
      verifier_contract_address: props.verifierContract?.address,
      verifier_contract_chain: props.verifierContract?.chain,
    };

    return response;
  }

  /**
   * Submits a new RegexBlueprint to the registry as draft.
   * This does not compile the circuits yet and you will still be able to make changes.
   * @returns A promise. Once it resolves, `getId` can be called.
   */
  public async submitDraft() {
    if (!this.auth) {
      throw new Error("auth is required, add it with Blueprint.addAuth(auth)");
    }

    if (this.props.id) {
      throw new Error("Blueprint was already saved");
    }

    const requestData = Blueprint.blueprintPropsToRequest(this.props);

    let response: BlueprintResponse;
    try {
      response = await post<BlueprintResponse>(`${this.baseUrl}/blueprint`, requestData, this.auth);
    } catch (err) {
      console.error("Failed calling POST on /blueprint/ in submitDraft: ", err);
      throw err;
    }

    this.props = Blueprint.responseToBlueprintProps(response);
  }

  /**
   * Chooses the preferred Zk Framework according to the provided example email
   * sets props.zkFramework
   * @param eml - The eml for this blueprint
   */
  async assignPreferredZkFramework(eml: string) {
    if (this.props.ignoreBodyHashCheck) {
      this.props.zkFramework = ZkFramework.Circom;
      return;
    }

    const bodyLength = await getMaxEmailBodyLength(eml, this.props.shaPrecomputeSelector);
    console.log("bodyLength: ", bodyLength);

    if (bodyLength > 10_000) {
      this.props.zkFramework = ZkFramework.Sp1;
    } else {
      this.props.zkFramework = ZkFramework.Circom;
    }
  }

  /**
   * Submits a new version of the RegexBlueprint to the registry as draft.
   * This does not compile the circuits yet and you will still be able to make changes.
   * @param newProps - The updated blueprint props.
   * @returns A promise. Once it resolves, the current Blueprint will be replaced with the new one.
   */
  public async submitNewVersionDraft(newProps: BlueprintProps) {
    if (!this.auth) {
      throw new Error("auth is required, add it with Blueprint.addAuth(auth)");
    }

    const requestData = Blueprint.blueprintPropsToRequest(newProps);

    let response: BlueprintResponse;
    try {
      response = await post<BlueprintResponse>(`${this.baseUrl}/blueprint`, requestData, this.auth);
    } catch (err) {
      console.error("Failed calling POST on /blueprint/ in submitNewVersionDraft: ", err);
      throw err;
    }

    this.props = Blueprint.responseToBlueprintProps(response);
  }

  /**
   * Submits a new version of the blueprint. This will save the new blueprint version
   * and start the compilation.
   * This will also overwrite the current Blueprint with its new version, even if the last
   * version was not compiled yet.
   * @param newProps - The updated blueprint props.
   */
  async submitNewVersion(newProps: BlueprintProps) {
    if (!this.auth) {
      throw new Error("auth is required, add it with Blueprint.addAuth(auth)");
    }

    if (!this.props.zkFramework) {
      throw new Error(
        "Please select zkFramework. Use blueprint.assignPreferredZkFramework to choose the optimal framework"
      );
    }

    await this.submitNewVersionDraft(newProps);

    // We don't check the status here, since we are compiling directly after submiting the draft.

    // Submit compile request
    try {
      await post<{ status: Status }>(
        `${this.baseUrl}/blueprint/compile/${this.props.id}`,
        null,
        this.auth
      );
    } catch (err) {
      // We don't set the status here, since the api call can't fail due to the actual job failing
      // It can only due to connectivity issues or the job runner not being available
      console.error("Failed calling POST on /blueprint/compile in submit: ", err);
      throw err;
    }
  }

  /**
   * Lists blueblueprints, only including the latest version per unique slug.
   * @param options - Options to filter the blueprints by.
   * @returns A promise. Once it resolves, `getId` can be called.
   */
  public static async listBlueprints(
    baseUrl: string,
    options?: ListBlueprintsOptions,
    auth?: Auth
  ): Promise<Blueprint[]> {
    if (options?.sortBy) {
      // Backend accepts snake case only
      // @ts-ignore
      options.sortBy = options.sortBy === "updatedAt" ? "updated_at" : options.sortBy;
    }

    let response: { blueprints?: BlueprintResponse[] };
    try {
      response = await get<{ blueprints?: BlueprintResponse[] }>(
        `${baseUrl}/blueprint`,
        options,
        auth
      );
    } catch (err) {
      console.error("Failed calling GET on /blueprint/ in listBlueprints: ", err);
      throw err;
    }

    if (!response.blueprints) {
      return [];
    }

    const blueprints = response.blueprints?.map((blueprintResponse) => {
      const blueprintProps = Blueprint.responseToBlueprintProps(blueprintResponse);
      return new Blueprint(blueprintProps, baseUrl, auth);
    });

    return blueprints;
  }

  /**
   * Submits a blueprint. This will save the blueprint if it didn't exist before
   * and start the compilation.
   */
  async submit() {
    if (!this.auth) {
      throw new Error("auth is required, add it with Blueprint.addAuth(auth)");
    }

    // If the blueprint wasn't save yet, we save it first to db
    if (!this.props.id) {
      try {
        await this.submitDraft();
      } catch (err) {
        console.error("Failed to create blueprint: ", err);
        throw err;
      }
    }

    if (!this.props.zkFramework) {
      throw new Error(
        "Please select zkFramework. Use blueprint.assignPreferredZkFramework to choose the optimal framework"
      );
    }

    const status = await this._checkStatus();

    // TODO: Should we allow retry on failed?
    if (Status.Done === status) {
      throw new Error("The circuits are already compiled.");
    }
    if (Status.InProgress === status) {
      throw new Error("The circuits already being compiled, please wait.");
    }

    // Submit compile request
    try {
      await post<{ status: Status }>(
        `${this.baseUrl}/blueprint/compile/${this.props.id}`,
        null,
        this.auth
      );
    } catch (err) {
      // We don't set the status here, since the api call can't fail due to the actual job failing
      // It can only due to connectivity issues or the job runner not being available
      console.error("Failed calling POST on /blueprint/compile in submit: ", err);
      throw err;
    }
  }

  // Request status from server and updates props.status
  private async _checkStatus(): Promise<Status> {
    let response: { status: Status };
    try {
      response = await get<{ status: Status }>(`${this.baseUrl}/blueprint/status/${this.props.id}`);
    } catch (err) {
      console.error("Failed calling GET /blueprint/status in getStatus(): ", err);
      throw err;
    }

    this.props.status = response.status;
    return response.status;
  }

  /**
   * Checks the status of blueprint.
   * checkStatus can be used in a while(await checkStatus()) loop, since it will wait a fixed
   * amount of time the second time you call it.
   * @returns A promise with the Status.
   */
  async checkStatus(): Promise<Status> {
    // Blueprint wasn't saved yet, return default status
    if (!this.props.id) {
      return this.props.status!;
    }

    if ([Status.Failed, Status.Done].includes(this.props.status!)) {
      return this.props.status!;
    }

    // Waits for a fixed period of time before you can call checkStatus again
    // This enables you to put checkStatus in a while(await checkStatus()) loop
    if (!this.lastCheckedStatus) {
      this.lastCheckedStatus = new Date();
    } else {
      // TODO: change for prod to one minute
      const waitTime = 0.5 * 1_000; // TODO: should be one minute;
      const sinceLastChecked = new Date().getTime() - this.lastCheckedStatus.getTime();
      if (sinceLastChecked < waitTime) {
        await new Promise((r) => setTimeout(r, waitTime - sinceLastChecked));
      }
    }

    const status = await this._checkStatus();

    return status;
  }

  /**
   * Get the id of the blueprint.
   * @returns The id of the blueprint. If it was not saved yet, return null.
   */
  getId(): string | null {
    return this.props.id || null;
  }

  /**
   * Returns a download link for the ZKeys of the blueprint.
   * @returns The the url to download the ZKeys.
   */
  async getZKeyDownloadLink(): Promise<DownloadUrls> {
    if (this.props.status !== Status.Done) {
      throw new Error("The circuits are not compiled yet, nothing to download.");
    }

    let response: { urls: DownloadUrls };
    try {
      response = await get<{ urls: DownloadUrls }>(
        `${this.baseUrl}/blueprint/zkey/${this.props.id}`
      );
    } catch (err) {
      console.error("Failed calling GET on /blueprint/zkey/:id in getZKeyDownloadLink: ", err);
      throw err;
    }

    return response.urls;
  }

  /**
   * Directly starts a download of the ZKeys in the browser.
   * Must be called within a user action, like a button click.
   */
  async startZKeyDownload() {
    if (!window && !document) {
      throw Error("startZKeyDownload can only be used in a browser");
    }

    let urls: DownloadUrls;
    try {
      urls = await this.getZKeyDownloadLink();
    } catch (err) {
      console.error("Failed to start download of ZKeys: ", err);
      throw err;
    }

    for (const [name, url] of Object.entries(urls)) {
      const link = document.createElement("a");
      link.href = url;
      link.download = name; // Set the desired filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Creates an instance of Prover with which you can create proofs.
   * @returns An instance of Prover.
   */
  createProver(options?: ProverOptions) {
    return new Prover(this, options);
  }

  /**
   * Verifies a proof on chain.
   * @param proof - The generated proof you want to verify.
   * @returns Returns true if the verification was successfull, false if it failed.
   */
  async verifyProofOnChain(proof: Proof): Promise<boolean> {
    try {
      await verifyProofOnChain(proof);
    } catch (err) {
      console.error("Failed to verify proof on chain: ", err);
      return false;
    }
    return true;
  }

  /**
   * Verifies a locally generated proof. This can be used, e.g. to verify a proof server side that was generated locally.
   * @param publicOutputs - The public outputs of the proof as string
   * @param proofData - The proof data to verify as string.
   * @returns Returns true if the verification was successfull, false if it failed.
   */
  async verifyProofData(publicOutputs: string, proofData: string): Promise<boolean> {
    if (this.props.zkFramework !== ZkFramework.Circom) {
      throw new Error("Can only verify a Circom proof from data. Use verifyProof instead.");
    }

    let vkey: string;
    try {
      vkey = await this.getVkey();
    } catch (err) {
      console.log("Failed to get vkey: ", err);
      return false;
    }

    return verifyProofData({
      publicOutputs,
      proofData,
      senderDomain: this.props.senderDomain!,
      vkey,
    });
  }

  /**
   * Verifies a proof.
   * @param proof - The generated proof you want to verify.
   * @returns Returns true if the verification was successfull, false if it failed.
   */
  async verifyProof(proof: Proof): Promise<boolean> {
    return verifyProof(proof);
  }

  /**
   * Returns a deep cloned version of the Blueprints props.
   * This can be used to update properties and then to use them with createNewVersion.
   * @param proof - The generated proof you want to verify.
   * @returns A true if the verification was successfull, false if it failed.
   */
  getClonedProps(): BlueprintProps {
    const cloned = JSON.parse(JSON.stringify(this.props));

    // Conver date strings
    if (cloned.createdAt) {
      cloned.createdAt = new Date(cloned.createdAt);
    }
    if (cloned.updatedAt) {
      cloned.updatedAt = new Date(cloned.updatedAt);
    }

    return cloned;
  }

  /**
   * Returns true if the blueprint can be updated. A blueprint can be updated if the circuits
   * haven't beed compiled yet, i.e. the status is not Done. The blueprint also must be saved
   * already before it can be updated.
   * @returns true if it can be updated
   */
  canUpdate(): boolean {
    return !!(this.props.id && ![Status.Done, Status.InProgress].includes(this.props.status!));
  }

  /**
   * Updates an existing blueprint that is not compiled yet.
   * @param newProps - The props the blueprint should be updated to.
   * @returns a promise.
   */
  async update(newProps: BlueprintProps) {
    if (!this.auth) {
      throw new Error("auth is required, add it with Blueprint.addAuth(auth)");
    }

    if (!this.canUpdate()) {
      throw new Error("Blueprint already compied, cannot update");
    }

    const requestData = Blueprint.blueprintPropsToRequest(newProps);

    let response: BlueprintResponse;
    try {
      response = await patch<BlueprintResponse>(
        `${this.baseUrl}/blueprint/${this.props.id}`,
        requestData,
        this.auth
      );
    } catch (err) {
      console.error("Failed calling PATCH on /blueprint/:id in update: ", err);
      throw err;
    }

    this.props = Blueprint.responseToBlueprintProps(response);
  }

  async listAllVersions(): Promise<Blueprint[]> {
    if (!this.props.id) {
      throw new Error("Blueprint was not saved yet");
    }
    let response: { blueprints: BlueprintResponse[] };
    try {
      response = await get<{ blueprints: BlueprintResponse[] }>(
        `${this.baseUrl}/blueprint/versions/${encodeURIComponent(this.props.slug!)}`
      );
    } catch (err) {
      console.error("Failed calling GET on /blueprint/versions/:slug in listAllVersions: ", err);
      throw err;
    }

    return response.blueprints.map((blueprintResponse) => {
      const blueprintProps = Blueprint.responseToBlueprintProps(blueprintResponse);
      return new Blueprint(blueprintProps, this.baseUrl, this.auth);
    });
  }

  async addStar(): Promise<number> {
    if (!this.auth) {
      throw new Error("Auth is required. Please login to star a blueprint.");
    }

    try {
      await post(
        `${this.baseUrl}/blueprint/${encodeURIComponent(this.props.slug!)}/stars`,
        null,
        this.auth
      );
      return await this.getStars();
    } catch (err) {
      console.error("Failed calling POST on /blueprint/${slug}/stars in addStar: ", err);
      throw err;
    }
  }

  async removeStar(): Promise<number> {
    if (!this.auth) {
      throw new Error("Auth is required. Please login to star a blueprint.");
    }

    try {
      await del(
        `${this.baseUrl}/blueprint/${encodeURIComponent(this.props.slug!)}/stars`,
        null,
        this.auth
      );
      return await this.getStars();
    } catch (err) {
      console.error("Failed calling DELETE on /blueprint/${id}/stars in addStar: ", err);
      throw err;
    }
  }

  async getStars(): Promise<number> {
    try {
      const { stars } = await get<{ stars: number }>(
        `${this.baseUrl}/blueprint/${encodeURIComponent(this.props.slug!)}/stars`
      );
      this.props.stars = stars || 0;
      return stars || 0;
    } catch (err) {
      console.error("Failed calling POST on /blueprint/${id}/stars in addStar: ", err);
      throw err;
    }
  }

  async cancelCompilation(): Promise<void> {
    if (this.props.status !== Status.InProgress) {
      throw new Error("Can only cancel compilation of a blueprint that is in progress");
    }
    try {
      await del<{ stars: number }>(
        `${this.baseUrl}/blueprint/cancel/${this.props.id}`,
        null,
        this.auth
      );
    } catch (err) {
      console.error("Failed calling DELETE on /blueprint/cancel/${id} in cancelCompilation: ", err);
      throw err;
    }
  }

  async delete(): Promise<void> {
    // TODO: add is admin check here, currently only done in registry
    // if (this.props.status !== Status.Draft) {
    //   throw new Error("Can only delete a blueprint that is in draft");
    // }
    try {
      await del<{ success: boolean }>(
        `${this.baseUrl}/blueprint/${this.props.id}`,
        null,
        this.auth
      );
    } catch (err) {
      console.error("Failed calling DELETE on /blueprint/${id} in cancelCompilation: ", err);
      throw err;
    }
  }

  async getChunkedZkeyDownloadLinks(): Promise<ChunkedZkeyUrl[]> {
    if (this.props.status !== Status.Done) {
      throw new Error("The circuits are not compiled yet, nothing to download.");
    }

    let response: { urls: ChunkedZkeyUrl[] };
    try {
      response = await get<{ urls: ChunkedZkeyUrl[] }>(
        `${this.baseUrl}/blueprint/chunked-zkey/${this.props.id}`
      );
    } catch (err) {
      console.error(
        "Failed calling GET on /blueprint/chunked-zkey/:id in getChunkedZkeyDownloadLinks: ",
        err
      );
      throw err;
    }

    return response.urls;
  }

  async getWasmFileDownloadLink(): Promise<string> {
    if (this.props.status !== Status.Done) {
      throw new Error("The circuits are not compiled yet, nothing to download.");
    }

    let response: { url: string };
    try {
      response = await get<{ url: string }>(`${this.baseUrl}/blueprint/wasm/${this.props.id}`);
    } catch (err) {
      console.error("Failed calling GET on /blueprint/wasm/:id in getWasmFileDownloadLink: ", err);
      throw err;
    }

    return response.url;
  }

  async getVkeyFileDownloadLink(): Promise<string> {
    if (this.props.status !== Status.Done) {
      throw new Error("The circuits are not compiled yet, nothing to download.");
    }

    let response: { url: string };
    try {
      response = await get<{ url: string }>(`${this.baseUrl}/blueprint/vkey/${this.props.id}`);
    } catch (err) {
      console.error("Failed calling GET on /blueprint/vkey/:id in getVkeyFileDownloadLink: ", err);
      throw err;
    }

    return response.url;
  }

  async getVkey(): Promise<string> {
    try {
      const downloadUrl = await this.getVkeyFileDownloadLink();
      const response = await fetch(downloadUrl);
      const vkey = await response.text();
      return vkey;
    } catch (err) {
      console.error("error in getVkey");
      throw err;
    }
  }

  async getNumOfRemoteProofs(): Promise<number> {
    let countResponse: { count: number };
    try {
      countResponse = await get<{ count: number }>(
        `${this.baseUrl}/blueprint/count-remote-proofs/${this.props.id}`
      );
    } catch (err) {
      console.error("Failed calling /blueprint/:id in getBlueprintById: ", err);
      throw err;
    }

    return countResponse.count;
  }

  /**
   * Validates if a given email matches the blueprint.
   * throw an error if false otherwise returns undefined
   */
  async validateEmail(eml: string): Promise<void> {
    try {
      await testBlueprint(eml, this.props, false);
    } catch (err) {
      console.warn("Email is invalid: ", err);
      throw err;
    }
  }
}

// export {
//   BlueprintProps,
//   DecomposedRegex,
//   DecomposedRegexPart,
//   ExternalInput,
//   ZkFramework,
//   Status,
//   VerifierContract,
//   RevealHeaderFields,
// } from "./types/blueprint";

export * from "./types/blueprint";
