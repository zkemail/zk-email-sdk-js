import { Dir } from "fs";
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
  publicOutputs?: string[];
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
  public_outputs?: string[];
  started_at: ServerDate;
  proved_at?: ServerDate;
  status: number;
};

export type ProofRequest = {
  blueprint_id: string;
  input: any;
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
