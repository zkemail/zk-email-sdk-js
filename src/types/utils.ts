// Provisional type, should be generated from relayer-utils
export type ParsedEmail = {
  canonicalizedHeader: string;
  canonicalizedBody: string;
  signature: number[];
  publicKey: any[];
  cleanedBody: string;
  headers: Map<string, string[]>;
};
