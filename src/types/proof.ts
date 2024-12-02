import { ServerDate } from "./blueprint";

// According to protobufs
export enum ProofStatus {
  None,
  InProgress,
  Done,
  Failed,
}

export type ProofProps = {
  id: string;
  blueprintId: string;
  input: string;
  proofData?: string;
  publicData?: string;
  externalInputs?: string;
  status?: ProofStatus;
  startedAt?: Date;
  provedAt?: Date;
};

export type ProofResponse = {
  id: string;
  blueprint_id: string;
  input: string;
  proof?: string;
  public?: string;
  external_inputs?: string;
  started_at: ServerDate;
  proved_at?: ServerDate;
  status: number;
};

export type ProofRequest = {
  blueprint_id: string;
  input: string;
  external_inputs: string;
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
