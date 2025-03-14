// Provisional type, should be generated from relayer-utils
export type ParsedEmail = {
  canonicalizedHeader: string;
  canonicalizedBody: string;
  signature: number[];
  // In rust it's a Vec<u8>. In TS this would be a Uint8Array. Wasm still returns a number[]
  // Converting the value back and forth seems unnecessary, so we leave it at number[]
  publicKey: number[];
  cleanedBody: string;
  headers: Map<string, string[]>;
};

export type DkimRecord = {
  domain: string;
  selector: string;
  // UTC Date String
  firstSeenAt: string;
  // UTC Date String
  lastSeenAt: string;
  // string with selectors, e.g. "v=DIM1;t=s"
  value: string;
};

export enum HashingAlgorithm {
  None,
  Poseidon,
  Sha256,
}
