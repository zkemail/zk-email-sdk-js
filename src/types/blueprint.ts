export type BlueprintProps = {
  id?: string;
  title: string;
  description?: string;
  slug?: string;
  tags?: string[];
  emailQuery?: string;
  circuitName: string;
  ignoreBodyHashCheck?: boolean;
  shaPrecomputeSelector?: string;
  emailBodyMaxLength?: number;
  emailHeaderMaxLength?: number;
  removeSoftLinebreaks?: boolean;
  githubUsername?: string;
  senderDomain?: string;
  enableHeaderMasking?: boolean;
  enableBodyMasking?: boolean;
  zkFramework?: ZkFramework;
  isPublic?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  externalInputs?: ExternalInput[];
  decomposedRegexes: DecomposedRegex[];
  status?: Status;
  verifierContract?: VerifierContract;
  version?: number;
  stars?: number;
  numLocalProofs?: number;
};

export type DecomposedRegex = {
  parts: DecomposedRegexPart[];
  name: string;
  maxLength: number;
  isHashed?: boolean;
  location: "body" | "header";
};

export type DecomposedRegexPart = {
  isPublic: boolean;
  regexDef: string;
};

export type DecomposedRegexJson = {
  parts: DecomposedRegexPartJson[];
  name: string;
  max_length: number;
  is_hashed?: boolean;
  location: "body" | "header";
};

export type DecomposedRegexPartJson = {
  is_public: boolean;
  regex_def: string;
};

export type ExternalInput = {
  name: string;
  maxLength: number;
};

// According to protobufs
export enum ZkFramework {
  None,
  Circom,
  Sp1,
}

// According to protobufs
export enum Status {
  None,
  Draft,
  InProgress,
  Done,
  Failed,
}

export type VerifierContract = {
  address?: string;
  chain: number;
};

export type BlueprintRequest = {
  id?: string;
  title: string;
  description?: string;
  slug?: string;
  tags?: string[];
  email_query?: string;
  circuit_name?: string;
  ignore_body_hash_check?: boolean;
  sha_precompute_selector?: string;
  email_body_max_length?: number;
  email_header_max_length?: number;
  remove_soft_linebreaks?: boolean;
  // TODO: Make non ? after login with github
  github_username?: string;
  sender_domain?: string;
  enable_header_masking?: boolean;
  enable_body_masking?: boolean;
  zk_framework?: number;
  is_public?: boolean;
  external_inputs?: ExternalInputResponse[];
  decomposed_regexes: DecomposedRegexResponse[];
  status?: string;
  verifier_contract_address?: string;
  verifier_contract_chain?: number;
  version?: number;
};

export type BlueprintResponse = {
  id: string;
  title: string;
  description: string;
  slug: string;
  tags: string[];
  email_query: string;
  circuit_name: string;
  ignore_body_hash_check: boolean;
  sha_precompute_selector: string;
  email_body_max_length: number;
  email_header_max_length?: number;
  remove_soft_linebreaks?: boolean;
  github_username?: string;
  sender_domain: string;
  enable_header_masking?: boolean;
  enable_body_masking?: boolean;
  zk_framework: number;
  is_public: boolean;
  created_at: ServerDate;
  updated_at: ServerDate;
  external_inputs: ExternalInputResponse[];
  decomposed_regexes: DecomposedRegexResponse[];
  status: number;
  verifier_contract_address: string;
  verifier_contract_chain: number;
  version: number;
  stars: number;
  num_local_proofs: number;
};

export type ServerDate = {
  seconds: number;
  nanos: number;
};

export type ExternalInputResponse = {
  name: string;
  max_length: number;
};

export type DecomposedRegexResponse = {
  parts: DecomposedRegexPartResponse[];
  name: string;
  max_length: number;
  is_hashed?: boolean;
  location: "body" | "header";
};

export type DecomposedRegexPartResponse = {
  is_public: boolean;
  regex_def: string;
};

export type ListBlueprintsOptions = {
  skip?: number;
  limit?: number;
  sort?: -1 | 1;
  sortBy?: "updatedAt" | "stars";
  status?: Status[];
  isPublic?: boolean;
  search?: string;
};

export type DownloadUrls = Record<string, string>;

export type ChunkedZkeyUrl = {
  url: string;
  suffix: "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k";
};
