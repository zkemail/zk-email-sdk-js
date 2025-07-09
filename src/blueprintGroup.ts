import { BlueprintGroupProps, BlueprintGroupRequest, BlueprintGroupResponse } from "./types/blueprintGroup";
import { Auth } from "./types/auth";
import { del, get, patch, post } from "./utils";
import { logger } from "./utils/logger";
import { Blueprint } from "./blueprint";

export class BlueprintGroup {
  props: BlueprintGroupProps;
  auth?: Auth;
  baseUrl: string;
  blueprints: Blueprint[];
  
  constructor(props: BlueprintGroupProps, baseUrl: string, auth?: Auth) {
    this.props = props;
    this.blueprints = [];
    this.baseUrl = baseUrl;
    this.auth = auth;
  }
  
  addAuth(auth: Auth) {
    this.auth = auth;
  }
  
  /**
   * Saves the blueprintGroup
   */
  async save() {
    if (!this.auth) {
      throw new Error("auth is required, add it with Blueprint.addAuth(auth)");
    }

    // If the blueprint wasn't save yet, we save it first to db
    if (this.props.id) {
      return this.update(this.props);
    }

    if (!this.props.blueprintIds?.length && !this.props.blueprintSlugs) {
      throw new Error(
        "Please first add blueprintIds or blueprintSlugs to save a group"
      );
    }

    const blueprintGroupRequest = BlueprintGroup.blueprintGroupPropsToRequest(this.props);
    
    // Submit save request
    let blueprintGroupResponse: BlueprintGroupResponse;
    try {
      blueprintGroupResponse = await post<BlueprintGroupResponse>(
        `${this.baseUrl}/blueprint-group`,
        blueprintGroupRequest,
        this.auth
      );
    } catch (err) {
      logger.error("Failed calling POST on /blueprint-group in save: ", err);
      throw err;
    }
    
    const blueprintGroupProps = BlueprintGroup.responseToBlueprintGroupProps(blueprintGroupResponse);
    this.props = blueprintGroupProps;
  }
  
  private static blueprintGroupPropsToRequest(props: BlueprintGroupProps): BlueprintGroupRequest {
    const request: BlueprintGroupRequest = {
      name: props.name,
      description: props.description,
      blueprint_ids: props.blueprintIds,
      blueprint_slugs: props.blueprintSlugs,
    };
    return request;
  }
  
  private static responseToBlueprintGroupProps(response: BlueprintGroupResponse): BlueprintGroupProps {
    const props: BlueprintGroupProps = {
        id: response.id,
        name: response.name,
        description: response.description,
        blueprintIds: response.blueprint_ids,
        blueprintSlugs: response.blueprint_slugs,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        githubUsername: response.github_username,
        isPublic: response.is_public
    }
    return props;
  }
  
  async update(props: BlueprintGroupProps) {
    if (!this.props.id) {
      throw new Error("BlueprintGroup does not exist yet. Please use save first");
    }
    
    if (!props.blueprintIds?.length && !props.blueprintSlugs) {
      throw new Error(
        "BlueprintIds and blueprintSlugs can't both be empty"
      );
    }

    const blueprintGroupRequest = BlueprintGroup.blueprintGroupPropsToRequest(props);
    
    // Submit save request
    let blueprintGroupResponse: BlueprintGroupResponse;
    try {
      blueprintGroupResponse = await patch<BlueprintGroupResponse>(
        `${this.baseUrl}/blueprint-group/${this.props.id}`,
        blueprintGroupRequest,
        this.auth
      );
    } catch (err) {
      logger.error("Failed calling POST on /blueprint-group in save: ", err);
      throw err;
    }
    
    const blueprintGroupProps = BlueprintGroup.responseToBlueprintGroupProps(blueprintGroupResponse);
    this.props = blueprintGroupProps;
  }
  
  /**
   * Fetches an existing BlueprintGroup.
   * @param {string} id - Id of the BlueprintGroup.
   * @returns A promise that resolves to a new instance of BlueprintGroup.
   */
  public static async getBlueprintGroupById(
    id: string,
    baseUrl: string,
    auth?: Auth
  ): Promise<BlueprintGroup> {
    logger.info("getting blueprint by id");
    let blueprintGroupResponse: BlueprintGroupResponse;
    try {
      blueprintGroupResponse = await get<BlueprintGroupResponse>(`${baseUrl}/blueprint-group/${id}`);
    } catch (err) {
      logger.error("Failed calling /blueprint-group/:id in getBlueprintGroupById: ", err);
      throw err;
    }

    const blueprintGroupProps = BlueprintGroup.responseToBlueprintGroupProps(blueprintGroupResponse);
    const blueprintGroup = new BlueprintGroup(blueprintGroupProps, baseUrl, auth);
    return blueprintGroup;
  }
  
  async delete(): Promise<void> {
    try {
      await del<{ success: boolean }>(
        `${this.baseUrl}/blueprint-group/${this.props.id}`,
        null,
        this.auth
      );
    } catch (err) {
      logger.error("Failed calling DELETE on /blueprint-group/${id} in delete: ", err);
      throw err;
    }
  }
  
  async fetchBlueptrints(): Promise<Blueprint[]> {
    const blueprintPromises: Promise<Blueprint>[] = [];
    
    for (const id of this.props.blueprintIds || []) {
      blueprintPromises.push(Blueprint.getBlueprintById(id, this.baseUrl));
    }
    
    for (const slug of this.props.blueprintSlugs || []) {
      blueprintPromises.push(Blueprint.getBlueprintBySlug(slug, this.baseUrl))
    }
    
    const blueprints = await Promise.all(blueprintPromises);
    this.blueprints = blueprints;
    return blueprints;
  }
}
