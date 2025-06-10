import { type Noir } from "@noir-lang/noir_js";
import { type UltraHonkBackend } from "@aztec/bb.js";

export type ProverOptions = {
  isLocal: boolean;
};

export type ExternalInputInput = {
  name: string;
  value: string;
};

export type NoirWasm = {
  Noir: typeof Noir;
  UltraHonkBackend: typeof UltraHonkBackend;
};

export type GenerateProofOptions = {
  noirWasm?: NoirWasm;
};
