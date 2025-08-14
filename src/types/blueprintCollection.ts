// ... existing code ...

import { ServerDate } from "./blueprint";

// Blueprint Collection Types
export type BlueprintCollectionProps = {
  id?: string;
  title: string;
  description?: string;
  slug?: string;
  tags?: string[];
  isPublic?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  blueprintIds?: string[];
  numBlueprints?: number;
};

export type BlueprintCollectionRequest = {
  id?: string;
  title: string;
  description?: string;
  slug?: string;
  tags?: string[];
  is_public?: boolean;
  blueprint_ids?: string[];
};

export type BlueprintCollectionResponse = {
  id: string;
  title: string;
  description: string;
  slug: string;
  tags: string[];
  is_public: boolean;
  created_at: ServerDate;
  updated_at: ServerDate;
  blueprint_ids: string[];
  num_blueprints: number;
};

export type ListBlueprintCollectionsOptions = {
  skip?: number;
  limit?: number;
  sort?: -1 | 1;
  sortBy?: "updatedAt" | "createdAt" | "numBlueprints";
  isPublic?: boolean;
  search?: string;
};
