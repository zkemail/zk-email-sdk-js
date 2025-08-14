import {
  BlueprintCollectionProps,
  BlueprintCollectionRequest,
  BlueprintCollectionResponse,
  ListBlueprintCollectionsOptions,
} from "./types/blueprintCollection";
import { get, post, patch, del } from "./utils";
import { Auth } from "./types/auth";
import { logger } from "./utils/logger";

/**
 * Represents a Blueprint Collection that groups related blueprints together.
 */
export class BlueprintCollection {
  props: BlueprintCollectionProps;
  auth?: Auth;
  baseUrl: string;

  constructor(props: BlueprintCollectionProps, baseUrl: string, auth?: Auth) {
    // Use defaults for unset fields
    this.props = {
      isPublic: true,
      tags: [],
      blueprintIds: [],
      ...props,
    };

    this.baseUrl = baseUrl;
    this.auth = auth;
  }

  /**
   * Gets the collection ID.
   * @returns The collection ID if it exists.
   */
  getId(): string | undefined {
    return this.props.id;
  }

  /**
   * Gets the collection title.
   * @returns The collection title.
   */
  getTitle(): string {
    return this.props.title;
  }

  /**
   * Gets the collection description.
   * @returns The collection description.
   */
  getDescription(): string | undefined {
    return this.props.description;
  }

  /**
   * Gets the collection slug.
   * @returns The collection slug.
   */
  getSlug(): string | undefined {
    return this.props.slug;
  }

  /**
   * Gets the collection tags.
   * @returns The collection tags.
   */
  getTags(): string[] {
    return this.props.tags || [];
  }

  /**
   * Gets whether the collection is public.
   * @returns Whether the collection is public.
   */
  isPublic(): boolean {
    return this.props.isPublic ?? true;
  }

  /**
   * Gets the number of blueprints in the collection.
   * @returns The number of blueprints.
   */
  getNumBlueprints(): number {
    return this.props.numBlueprints || 0;
  }

  /**
   * Gets the blueprint IDs in the collection.
   * @returns The blueprint IDs.
   */
  getBlueprintIds(): string[] {
    return this.props.blueprintIds || [];
  }

  /**
   * Fetches an existing BlueprintCollection from the database by ID.
   * @param id - ID of the BlueprintCollection.
   * @param baseUrl - Base URL for the API.
   * @param auth - Authentication object.
   * @returns A promise that resolves to a new instance of BlueprintCollection.
   */
  public static async getBlueprintCollectionById(
    id: string,
    baseUrl: string,
    auth?: Auth
  ): Promise<BlueprintCollection> {
    logger.info("Getting blueprint collection by id");
    let collectionResponse: BlueprintCollectionResponse;
    try {
      collectionResponse = await get<BlueprintCollectionResponse>(
        `${baseUrl}/blueprint-collection/${id}`,
        null,
        auth
      );
    } catch (err) {
      logger.error("Failed calling /blueprint-collection/:id in getBlueprintCollectionById: ", err);
      throw err;
    }

    const collectionProps = this.responseToBlueprintCollectionProps(collectionResponse);
    const collection = new BlueprintCollection(collectionProps, baseUrl, auth);

    return collection;
  }

  /**
   * Fetches an existing BlueprintCollection by slug from the database.
   * @param slug - Slug of the blueprint collection.
   * @param baseUrl - Base URL for the API.
   * @param auth - Authentication object.
   * @returns A promise that resolves to a new instance of BlueprintCollection.
   */
  public static async getBlueprintCollectionBySlug(
    slug: string,
    baseUrl: string,
    auth?: Auth
  ): Promise<BlueprintCollection> {
    logger.info("Getting blueprint collection by slug");
    let collectionResponse: BlueprintCollectionResponse;
    try {
      const url = `${baseUrl}/blueprint-collection/by-slug/${encodeURIComponent(slug)}`;
      collectionResponse = await get<BlueprintCollectionResponse>(url, null, auth);
    } catch (err) {
      logger.error("Failed calling /blueprint-collection/by-slug/:slug in getBlueprintCollectionBySlug: ", err);
      throw err;
    }

    const collectionProps = this.responseToBlueprintCollectionProps(collectionResponse);
    const collection = new BlueprintCollection(collectionProps, baseUrl, auth);

    return collection;
  }

  /**
   * Lists blueprint collections.
   * @param baseUrl - Base URL for the API.
   * @param options - Options to filter the collections by.
   * @param auth - Authentication object.
   * @returns A promise that resolves to an array of BlueprintCollection instances.
   */
  public static async listBlueprintCollections(
    baseUrl: string,
    options?: ListBlueprintCollectionsOptions,
    auth?: Auth
  ): Promise<BlueprintCollection[]> {
    if (options?.sortBy) {
      // Backend accepts snake case only
      // @ts-ignore
      options.sortBy =
        options.sortBy === "updatedAt"
          ? "updated_at"
          : options.sortBy === "createdAt"
            ? "created_at"
            : options.sortBy === "numBlueprints"
              ? "num_blueprints"
              : options.sortBy;
    }

    let response: { collections?: BlueprintCollectionResponse[]; blueprint_collections?: BlueprintCollectionResponse[] };
    try {
      response = await get<{ collections?: BlueprintCollectionResponse[]; blueprint_collections?: BlueprintCollectionResponse[] }>(
        `${baseUrl}/blueprint-collection`,
        options,
        auth
      );
    } catch (err) {
      logger.error("Failed calling GET on /blueprint-collection in listBlueprintCollections: ", err);
      throw err;
    }

    // Handle both response formats for backward compatibility
    const collectionsData = response.collections || response.blueprint_collections;
    if (!collectionsData) {
      return [];
    }

    const collections = collectionsData.map((collectionResponse) => {
      const collectionProps = BlueprintCollection.responseToBlueprintCollectionProps(collectionResponse);
      return new BlueprintCollection(collectionProps, baseUrl, auth);
    });

    return collections;
  }

  /**
   * Creates a new blueprint collection.
   * @param props - Blueprint collection properties.
   * @param baseUrl - Base URL for the API.
   * @param auth - Authentication object (required for creation).
   * @returns A promise that resolves to the created BlueprintCollection.
   */
  public static async createBlueprintCollection(
    props: BlueprintCollectionProps,
    baseUrl: string,
    auth: Auth
  ): Promise<BlueprintCollection> {
    logger.info("Creating blueprint collection");
    
    const request: BlueprintCollectionRequest = {
      title: props.title,
      description: props.description,
      slug: props.slug,
      tags: props.tags,
      is_public: props.isPublic,
      blueprint_ids: props.blueprintIds,
    };

    let collectionResponse: BlueprintCollectionResponse;
    try {
      collectionResponse = await post<BlueprintCollectionResponse>(
        `${baseUrl}/blueprint-collection`,
        request,
        auth
      );
    } catch (err) {
      logger.error("Failed calling POST on /blueprint-collection in createBlueprintCollection: ", err);
      throw err;
    }

    const collectionProps = this.responseToBlueprintCollectionProps(collectionResponse);
    const collection = new BlueprintCollection(collectionProps, baseUrl, auth);

    return collection;
  }

  /**
   * Updates an existing blueprint collection.
   * @param id - ID of the collection to update.
   * @param updates - Partial blueprint collection properties to update.
   * @param baseUrl - Base URL for the API.
   * @param auth - Authentication object (required for updates).
   * @returns A promise that resolves to the updated BlueprintCollection.
   */
  public static async updateBlueprintCollection(
    id: string,
    updates: Partial<BlueprintCollectionProps>,
    baseUrl: string,
    auth: Auth
  ): Promise<BlueprintCollection> {
    logger.info("Updating blueprint collection");
    
    // First, get the current collection to preserve existing values
    let currentCollection: BlueprintCollection;
    try {
      currentCollection = await BlueprintCollection.getBlueprintCollectionById(id, baseUrl);
    } catch (err) {
      logger.error("Failed to get current collection for update:", err);
      throw err;
    }
    
    // Merge updates with current values to avoid conflicts
    const request: BlueprintCollectionRequest = {
      title: updates.title ?? currentCollection.getTitle(),
      description: updates.description ?? currentCollection.getDescription(),
      slug: updates.slug ?? currentCollection.getSlug(),
      tags: updates.tags ?? currentCollection.getTags(),
      is_public: updates.isPublic ?? currentCollection.isPublic(),
      blueprint_ids: updates.blueprintIds ?? currentCollection.getBlueprintIds(),
    };

    let collectionResponse: BlueprintCollectionResponse;
    try {
      collectionResponse = await patch<BlueprintCollectionResponse>(
        `${baseUrl}/blueprint-collection/${id}`,
        request,
        auth
      );
    } catch (err) {
      logger.error("Failed calling PATCH on /blueprint-collection/:id in updateBlueprintCollection: ", err);
      throw err;
    }

    const collectionProps = this.responseToBlueprintCollectionProps(collectionResponse);
    const collection = new BlueprintCollection(collectionProps, baseUrl, auth);

    return collection;
  }

  /**
   * Deletes a blueprint collection.
   * @param id - ID of the collection to delete.
   * @param baseUrl - Base URL for the API.
   * @param auth - Authentication object (required for deletion).
   * @returns A promise that resolves when the collection is deleted.
   */
  public static async deleteBlueprintCollection(
    id: string,
    baseUrl: string,
    auth: Auth
  ): Promise<void> {
    logger.info("Deleting blueprint collection");
    
    try {
      await del(`${baseUrl}/blueprint-collection/${id}`, null, auth);
    } catch (err) {
      logger.error("Failed calling DELETE on /blueprint-collection/:id in deleteBlueprintCollection: ", err);
      throw err;
    }
  }

  /**
   * Updates the current blueprint collection.
   * @param updates - Partial blueprint collection properties to update.
   * @returns A promise that resolves to the updated BlueprintCollection.
   */
  async update(updates: Partial<BlueprintCollectionProps>): Promise<BlueprintCollection> {
    if (!this.auth) {
      throw new Error("auth is required, add it with BlueprintCollection.addAuth(auth)");
    }

    if (!this.props.id) {
      throw new Error("Cannot update a collection that hasn't been saved yet");
    }

    const updatedCollection = await BlueprintCollection.updateBlueprintCollection(
      this.props.id,
      updates,
      this.baseUrl,
      this.auth
    );

    // Update the current instance properties
    this.props = updatedCollection.props;

    return this;
  }

  /**
   * Deletes the current blueprint collection.
   * @returns A promise that resolves when the collection is deleted.
   */
  async delete(): Promise<void> {
    if (!this.auth) {
      throw new Error("auth is required, add it with BlueprintCollection.addAuth(auth)");
    }

    if (!this.props.id) {
      throw new Error("Cannot delete a collection that hasn't been saved yet");
    }

    await BlueprintCollection.deleteBlueprintCollection(this.props.id, this.baseUrl, this.auth);
  }

  /**
   * Adds authentication to the blueprint collection.
   * @param auth - Authentication object.
   */
  addAuth(auth: Auth): void {
    this.auth = auth;
  }

  // Maps the blueprint collection API response to the BlueprintCollectionProps
  private static responseToBlueprintCollectionProps(response: BlueprintCollectionResponse): BlueprintCollectionProps {
    const props: BlueprintCollectionProps = {
      id: response.id,
      title: response.title,
      description: response.description,
      slug: response.slug,
      tags: response.tags,
      isPublic: response.is_public,
      createdAt: new Date(response.created_at.seconds * 1000),
      updatedAt: new Date(response.updated_at.seconds * 1000),
      blueprintIds: response.blueprint_ids,
      numBlueprints: response.num_blueprints,
    };

    return props;
  }
}
