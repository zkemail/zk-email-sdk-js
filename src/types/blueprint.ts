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
  clientZkFramework?: ZkFramework;
  serverZkFramework?: ZkFramework;
  isPublic?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  externalInputs?: ExternalInput[];
  decomposedRegexes: DecomposedRegex[];
  clientStatus?: Status;
  serverStatus?: Status;
  verifierContract?: VerifierContract;
  version?: number;
  stars?: number;
  numLocalProofs?: number;
  totalProofs?: number;
  internalVersion?: string;
};

export type DecomposedRegex = {
  parts: DecomposedRegexPart[];
  name: string;
  isHashed?: boolean;
  location: "body" | "header";
  maxMatchLength: number;
};

export type DecomposedRegexPart = {
  isPublic: boolean;
  regexDef: string;
  maxLength?: number;
};

export type DecomposedRegexJson = {
  parts: DecomposedRegexPartJson[];
  name: string;
  is_hashed?: boolean;
  location: "body" | "header";
  max_match_length: number;
};

export type DecomposedRegexPartJson = {
  is_public: boolean;
  regex_def: string;
  max_length?: number;
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
  Noir,
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
  client_zk_framework?: number;
  server_zk_framework?: number;
  is_public?: boolean;
  external_inputs?: ExternalInputResponse[];
  decomposed_regexes: DecomposedRegexResponse[];
  client_status?: string;
  server_status?: string;
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
  client_zk_framework: number;
  server_zk_framework: number;
  is_public: boolean;
  created_at: ServerDate;
  updated_at: ServerDate;
  external_inputs: ExternalInputResponse[];
  decomposed_regexes: DecomposedRegexResponse[];
  client_status: number;
  server_status: number;
  verifier_contract_address: string;
  verifier_contract_chain: number;
  version: number;
  stars: number;
  num_local_proofs: number;
  total_proofs: number;
  internal_version: string;
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
  is_hashed?: boolean;
  location: "body" | "header";
  max_match_length: number;
};

export type DecomposedRegexPartResponse = {
  is_public: boolean;
  regex_def: string;
  max_length?: number;
};

export type ListBlueprintsOptions = {
  skip?: number;
  limit?: number;
  sort?: -1 | 1;
  sortBy?: "updatedAt" | "stars" | "totalProofs";
  status?: Status[];
  isPublic?: boolean;
  search?: string;
};

export type DownloadUrls = Record<string, string>;

export type ChunkedZkeyUrl = {
  url: string;
  suffix: "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k";
};

export type StatusResponse = {
  client_status: Status;
  server_status: Status;
};

export type CompilationStatus = {
  clientStatus: Status;
  serverStatus: Status;
};
