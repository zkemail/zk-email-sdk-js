// Provisional type, should be generated from relayer-utils
export type ParsedEmail = {
  canonicalized_header: string;
  canonicalized_body: string;
  signature: number[];
  public_key: any[];
  cleaned_body: string;
  headers: Map<string, string[]>;
};
