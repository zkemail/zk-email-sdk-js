export type BlueprintProps = {
  id?: string;
  title: string;
  description?: string;
  slug: string;
  tags?: string[];
  emailQuery?: string;
  useNewSdk?: boolean;
  circuitName?: string;
  ignoreBodyHashCheck?: boolean;
  shaPrecomputeSelector?: string;
  emailBodyMaxLength?: number;
  senderDomain?: string;
  dkimSelector?: string;
  revealHeaderFields?: RevealHeaderFields;
  ignoreBodyHashCheckProp?: boolean;
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
};

export type DecomposedRegex = {
  parts: DecomposedRegexPart[];
  name: string;
  maxLength: number;
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

export enum ZkFramework {
  Circom = "circom",
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

export type RevealHeaderFields = {
  subject: boolean;
  timestamp: boolean;
  from: boolean;
  to: boolean;
};

export type BlueprintRequest = {
  id?: string;
  title: string;
  description?: string;
  slug: string;
  tags?: string[];
  email_query?: string;
  use_new_sdk?: boolean;
  circuit_name?: string;
  ignore_body_hash_check?: boolean;
  sha_precompute_selector?: string;
  email_body_max_length?: number;
  sender_domain?: string;
  dkim_selector?: string;
  reveal_header_subject?: boolean;
  reveal_header_timestamp?: boolean;
  reveal_header_from?: boolean;
  reveal_header_to?: boolean;
  ignore_body_hash_check_prop?: boolean;
  enable_header_masking?: boolean;
  enable_body_masking?: boolean;
  zk_framework?: string;
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
  use_new_sdk: boolean;
  circuit_name: string;
  ignore_body_hash_check: boolean;
  sha_precompute_selector: string;
  email_body_max_length: number;
  sender_domain: string;
  dkim_selector: string;
  reveal_header_subject: boolean;
  reveal_header_timestamp: boolean;
  reveal_header_from: boolean;
  reveal_header_to: boolean;
  ignore_body_hash_check_prop: boolean;
  enable_header_masking?: boolean;
  enable_body_masking?: boolean;
  zk_framework: string;
  is_public: boolean;
  created_at: ServerDate;
  updated_at: ServerDate;
  external_inputs: ExternalInputResponse[];
  decomposed_regexes: DecomposedRegexResponse[];
  status: number;
  verifier_contract_address: string;
  verifier_contract_chain: number;
  version: number;
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
  status?: Status;
  isPublic?: boolean;
  search?: string;
};

export type ListBlueprintsOptionsRequest = {
  skip?: number;
  limit?: number;
  sort?: -1 | 1;
  status?: Status;
  is_public?: boolean;
  search?: string;
};
