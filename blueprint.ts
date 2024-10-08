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
const BASE_URL = "localhost:8080";

/**
 * Represents a Regex Blueprint including the decomposed regex access to the circuit.
 */
export class Blueprint {
  props: BlueprintProps;

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
      blueprintResponse = await get<BlueprintResponse>(
        `${BASE_URL}/blueprint/${id}`
      );
    } catch (err) {
      console.error("Failed calling /blueprint/:id in getBlueprintById: ", err);
      throw err;
    }

    const blueprintProps = this.responseToBlueprintProps(blueprintResponse);

    const blueprint = new Blueprint(blueprintProps);

    return blueprint;
  }

  // Maps the blueprint API response to the BlueprintProps
  private static responseToBlueprintProps(
    response: BlueprintResponse
  ): BlueprintProps {
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
      response = await post<BlueprintResponse>(
        `${BASE_URL}/blueprint`,
        requestData
      );
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
  public static async listBlueprints(
    options?: ListBlueprintsOptions
  ): Promise<Blueprint[]> {
    const requestOptions: ListBlueprintsOptionsRequest = {
      skip: options?.skip,
      limit: options?.limit,
      sort: options?.sort,
      status: options?.status,
      is_public: options?.isPublic,
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
      const blueprintProps =
        Blueprint.responseToBlueprintProps(blueprintResponse);
      return new Blueprint(blueprintProps);
    });
  }

  /**
   * Get the id of the blueprint.
   * @returns The id of the blueprint. If it was not saved yet, return null.
   */
  getId(): string | null {
    return this.props.id || null;
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
