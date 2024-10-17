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
  status?: ProofStatus;
  circuitInput?: string;
  startedAt?: Date;
  provenAt?: Date;
};

export type ProofResponse = {
  id: string;
  blueprint_id: string;
  circuit_input: string;
  started_at: ServerDate;
  proven_at?: ServerDate;
  status: string;
};

export type ProofRequest = {
  blueprint_id: string;
  circuit_input: string;
};
