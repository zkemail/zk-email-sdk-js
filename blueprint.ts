import {
  BlueprintProps,
  BlueprintRequest,
  BlueprintResponse,
  ListBlueprintsOptions,
  ListBlueprintsOptionsRequest,
  Status,
  ZkFramework,
} from "./types/blueprint";
import { get, post } from "./utils";

// TODO: replace with prod version
const BASE_URL = "http://localhost:8080";

/**
 * Represents a Regex Blueprint including the decomposed regex access to the circuit.
 */
export class Blueprint {
  props: BlueprintProps;

  private lastCheckedStatus: Date;

  constructor(props: BlueprintProps) {
    this.props = {
      ignoreBodyHashCheck: false,
      enableHeaderMasking: false,
      enableBodyMasking: false,
      isPublic: true,
      status: Status.Draft,
      ...props,
      revealHeaderFields: {
        subject: false,
        timestamp: false,
        from: false,
        to: false,
        ...props.revealHeaderFields,
      },
    };
  }

  /**
   * Fetches an existing RegexBlueprint from the database.
   * @param {string} id - Id of the RegexBlueprint.
   * @returns A promise that resolves to a new instance of RegexBlueprint.
   */
  public static async getBlueprintById(id: string): Promise<Blueprint> {
    let blueprintResponse: BlueprintResponse;
    try {
      blueprintResponse = await get<BlueprintResponse>(`${BASE_URL}/blueprint/${id}`);
    } catch (err) {
      console.error("Failed calling /blueprint/:id in getBlueprintById: ", err);
      throw err;
    }

    const blueprintProps = this.responseToBlueprintProps(blueprintResponse);

    const blueprint = new Blueprint(blueprintProps);

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
      useNewSdk: response.use_new_sdk,
      circuitName: response.circuit_name,
      ignoreBodyHashCheck: response.ignore_body_hash_check,
      shaPrecomputeSelector: response.sha_precompute_selector,
      emailBodyMaxLength: response.email_body_max_length,
      senderDomain: response.sender_domain,
      dkimSelector: response.dkim_selector,
      revealHeaderFields: {
        subject: response.reveal_header_subject,
        timestamp: response.reveal_header_timestamp,
        from: response.reveal_header_from,
        to: response.reveal_header_to,
      },
      ignoreBodyHashCheckProp: response.ignore_body_hash_check_prop,
      enableHeaderMasking: response.enable_header_masking,
      enableBodyMasking: response.enable_body_masking,
      zkFramework: response.zk_framework as ZkFramework,
      isPublic: response.is_public,
      createdAt: new Date(response.created_at.seconds * 1000),
      updatedAt: new Date(response.updated_at.seconds * 1000),
      externalInputs: response.external_inputs?.map((input) => ({
        name: input.name,
        maxLength: input.max_length,
      })),
      decomposedRegexes: response.decomposed_regexes?.map((regex) => ({
        parts: regex.parts.map((part) => ({
          isPublic: part.is_public,
          regexDef: part.regex_def,
        })),
        name: regex.name,
        maxLength: regex.max_length,
        location: regex.location,
      })),
      status: response.status as Status,
      verifierContract: {
        address: response.verifier_contract_address,
        chain: response.verifier_contract_chain,
      },
    };

    return props;
  }

  // Maps the BlueprintProps to the BlueprintResponse
  private blueprintPropsToRequest(): BlueprintRequest {
    const response: BlueprintRequest = {
      id: this.props.id,
      title: this.props.title,
      description: this.props.description,
      slug: this.props.slug,
      tags: this.props.tags,
      email_query: this.props.emailQuery,
      use_new_sdk: this.props.useNewSdk,
      circuit_name: this.props.circuitName,
      ignore_body_hash_check: this.props.ignoreBodyHashCheck,
      sha_precompute_selector: this.props.shaPrecomputeSelector,
      email_body_max_length: this.props.emailBodyMaxLength,
      sender_domain: this.props.senderDomain,
      dkim_selector: this.props.dkimSelector,
      reveal_header_subject: this.props.revealHeaderFields?.subject,
      reveal_header_timestamp: this.props.revealHeaderFields?.timestamp,
      reveal_header_from: this.props.revealHeaderFields?.from,
      reveal_header_to: this.props.revealHeaderFields?.to,
      ignore_body_hash_check_prop: this.props.ignoreBodyHashCheckProp,
      enable_header_masking: this.props.enableHeaderMasking,
      enable_body_masking: this.props.enableBodyMasking,
      zk_framework: this.props.zkFramework,
      is_public: this.props.isPublic,
      external_inputs: this.props.externalInputs?.map((input) => ({
        name: input.name,
        max_length: input.maxLength,
      })),
      decomposed_regexes: this.props.decomposedRegexes?.map((regex) => ({
        parts: regex.parts.map((part) => ({
          is_public: part.isPublic,
          regex_def: part.regexDef,
        })),
        name: regex.name,
        max_length: regex.maxLength,
        location: regex.location,
      })),
      status: this.props.status,
      verifier_contract_address: this.props.verifierContract?.address,
      verifier_contract_chain: this.props.verifierContract?.chain,
    };

    return response;
  }

  /**
   * Submits a new RegexBlueprint to the registry as draft.
   * This does not compile the circuits yet and you will still be able to make changes.
   * @returns A promise. Once it resolves, `getId` can be called.
   */
  public async submitDraft() {
    const requestData = this.blueprintPropsToRequest();

    let response: BlueprintResponse;
    try {
      response = await post<BlueprintResponse>(`${BASE_URL}/blueprint`, requestData);
    } catch (err) {
      console.error("Failed calling POST on /blueprint/ in submitDraft: ", err);
      throw err;
    }

    this.props = Blueprint.responseToBlueprintProps(response);
  }

  /**
   * Submits a new RegexBlueprint to the registry as draft.
   * This does not compile the circuits yet and you will still be able to make changes.
   * @returns A promise. Once it resolves, `getId` can be called.
   */
  public static async listBlueprints(options?: ListBlueprintsOptions): Promise<Blueprint[]> {
    const requestOptions: ListBlueprintsOptionsRequest = {
      skip: options?.skip,
      limit: options?.limit,
      sort: options?.sort,
      status: options?.status,
      is_public: options?.isPublic,
      search: options?.search,
    };

    let response: { blueprints: BlueprintResponse[] };
    try {
      response = await get<{ blueprints: BlueprintResponse[] }>(
        `${BASE_URL}/blueprint`,
        requestOptions
      );
    } catch (err) {
      console.error("Failed calling POST on /blueprint/ in submitDraft: ", err);
      throw err;
    }

    return response.blueprints.map((blueprintResponse) => {
      const blueprintProps = Blueprint.responseToBlueprintProps(blueprintResponse);
      return new Blueprint(blueprintProps);
    });
  }

  /**
   * Submits a blueprint. This will save the blueprint if it didn't exist before
   * and start the compilation.
   */
  async submit() {
    // If the blueprint wasn't save yet, we save it first to db
    if (!this.props.id) {
      try {
        await this.submitDraft();
      } catch (err) {
        console.error("Failed to create blueprint: ", err);
        throw err;
      }
    }

    // Submit compile request
    let response: { status: Status };
    try {
      response = await post<{ status: Status }>(`${BASE_URL}/blueprint/compile/${this.props.id}`);
    } catch (err) {
      // We don't set the status here, since the api call can't fail due to the actual job failing
      // It can only due to connectivity issues or the job runner not being available
      console.error("Failed calling POST on /blueprint/compile in submit: ", err);
      throw err;
    }
  }

  // TODO: Add "debounce" so user can put this in a while loop
  /**
   * Checks the status of blueprint.
   * @returns A promise with the Status.
   */
  async checkStatus(): Promise<Status> {
    // Blueprint wasn't saved yet, return default status
    if (!this.props.id) {
      return this.props.status!;
    }

    if (this.props.status === Status.Done) {
      return this.props.status;
    }

    // Waits for a fixed period of time before you can call checkStatus again
    // This enables you to put checkStatus in a while(await checkStatu()) loop
    if (!this.lastCheckedStatus) {
      this.lastCheckedStatus = new Date();
    } else {
      // TODO: change for prod to one minute
      const waitTime = 0.5 * 1_000; // one minute;
      const sinceLastChecked = new Date().getTime() - this.lastCheckedStatus.getTime();
      if (sinceLastChecked < waitTime) {
        await new Promise((r) => setTimeout(r, waitTime - sinceLastChecked));
      }
    }

    // Submit compile request
    let response: { status: Status };
    try {
      response = await get<{ status: Status }>(`${BASE_URL}/blueprint/status/${this.props.id}`);
    } catch (err) {
      console.error("Failed calling GET /blueprint/status in getStatus(): ", err);
      throw err;
    }

    this.props.status = response.status;
    return response.status;
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
  async getZKeyDownloadLink(): Promise<string> {
    if (this.props.status !== Status.Done) {
      throw new Error("The circuits are not compiled yet, nothing to download.");
    }

    let response: { url: string };
    try {
      response = await get<{ url: string }>(`${BASE_URL}/blueprint/zkey/${this.props.id}`);
    } catch (err) {
      console.error("Failed calling GET on /blueprint/zkey/:id in getZKeyDownloadLink: ", err);
      throw err;
    }

    return response.url;
  }

  /**
   * Directly starts a download of the ZKeys in the browser.
   * Must be called within a user action, like a button click.
   */
  async startZKeyDownload() {
    if (!window && !document) {
      throw Error("startZKeyDownload can only be used in a browser");
    }

    let url: string;
    try {
      url = await this.getZKeyDownloadLink();
    } catch (err) {
      console.error("Failed to start download of ZKeys: ", err);
      throw err;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = "ZKeys.txt"; // Set the desired filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
