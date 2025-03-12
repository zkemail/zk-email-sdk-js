import { Dir } from "fs";
import { ServerDate } from "./blueprint";

// According to protobufs
export enum ProofStatus {
  None,
  InProgress,
  Done,
  Failed,
}

export type PublicProofData = {
  [key: string]: string[];
};

export type ExternalInputProof = {
  [key: string]: string;
};

export type ProofProps = {
  id: string;
  blueprintId: string;
  input: string;
  proofData?: string;
  publicData?: PublicProofData;
  publicOutputs?: string[];
  externalInputs?: ExternalInputProof;
  status?: ProofStatus;
  startedAt?: Date;
  provedAt?: Date;
  isLocal: boolean;
  sp1VkeyHash?: string;
};

export type ProofResponse = {
  id: string;
  blueprint_id: string;
  input: string;
  proof?: string;
  public?: PublicProofData;
  external_inputs?: ExternalInputProof;
  public_outputs?: string[];
  started_at: ServerDate;
  proved_at?: ServerDate;
  status: number;
  sp1_vkey_hash?: string;
};

export type ProofRequest = {
  blueprint_id: string;
  input?: any;
  eml?: string;
  external_inputs: any;
};

export type GenerateProofInputsParams = {
  emailHeaderMaxLength: number;
  emailBodyMaxLength: number;
  ignoreBodyHashCheck: boolean;
  removeSoftLinebreaks: boolean;
  shaPrecomputeSelector?: string;
};

export type GenerateProofInputsParamsInternal = {
  maxHeaderLength: number;
  maxBodyLength: number;
  ignoreBodyHashCheck: boolean;
  removeSoftLinesBreaks: boolean;
  shaPrecomputeSelector?: string;
};

export type ProofData = {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;
};
