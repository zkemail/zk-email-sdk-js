/**
 * BlueprintGroupProps type definition based on protobuf schema
 */
export interface BlueprintGroupProps {
  /** Unique identifier for the blueprint group */
  id?: string;
  
  /** Human-readable name of the blueprint group */
  name: string;
  
  /** Description of the blueprint group */
  description?: string;
  
  /** Array of blueprint IDs associated with this group */
  blueprintIds?: string[];
  
  /** Array of blueprint slugs associated with this group */
  blueprintSlugs?: string[];
  
  /** Timestamp when the blueprint group was created */
  createdAt?: Date;
  
  /** Timestamp when the blueprint group was last updated */
  updatedAt?: Date;
  
  /** GitHub username of the creator/owner */
  githubUsername?: string;
  
  /** Whether the blueprint group is publicly accessible */
  isPublic?: boolean;
}

/**
 * BlueprintGroupResponse type for response from server
 */
export interface BlueprintGroupResponse {
  /** Unique identifier for the blueprint group */
  id: string;
  
  /** Human-readable name of the blueprint group */
  name: string;
  
  /** Description of the blueprint group */
  description?: string;
  
  /** Array of blueprint IDs associated with this group */
  blueprint_ids?: string[];
  
  /** Array of blueprint slugs associated with this group */
  blueprint_slugs?: string[];
  
  /** Timestamp when the blueprint group was created */
  created_at: Date;
  
  /** Timestamp when the blueprint group was last updated */
  updated_at: Date;
  
  /** GitHub username of the creator/owner */
  github_username: string;
  
  /** Whether the blueprint group is publicly accessible */
  is_public: boolean;
}

/**
 * BlueprintGroupRequest type for response from server
 */
export interface BlueprintGroupRequest {
  /** Human-readable name of the blueprint group */
  name: string;
  
  /** Description of the blueprint group */
  description?: string;
  
  /** Array of blueprint IDs associated with this group */
  blueprint_ids?: string[];
  
  /** Array of blueprint slugs associated with this group */
  blueprint_slugs?: string[];
  
  /** Whether the blueprint group is publicly accessible */
  // is_public: boolean;
}
