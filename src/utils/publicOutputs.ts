/**
 * Canonical public outputs, and decoding helpers that read exactly the values a verifier checked.
 *
 * REASON: proof verifiers parse public inputs leniently (bb.js and snarkjs accept several
 * spellings of the same number, e.g. decimal vs hex, with or without zero padding), while the
 * decoders that turn outputs into displayed text read them their own way (e.g. hex characters
 * after "0x"). If the two disagree, the text shown for a proof is not what the proof proves.
 * So every output is converted to ONE canonical spelling first; verification and decoding then
 * use that same array, and anything that is not a plain number below the field modulus is
 * rejected.
 */

/** BN254 scalar field modulus: every public input of a Circom (Groth16) or Noir (UltraHonk) proof is below it. */
export const BN254_FIELD_MODULUS =
  0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n;

/** "hex": "0x" + 64 lowercase hex digits (bb.js / Noir). "decimal": base-10 string (snarkjs / Circom). */
export type PublicOutputFormat = "hex" | "decimal";

/**
 * Every public output in one canonical spelling, or throw.
 * Accepts a 0x-prefixed hex string (1-64 digits) or a plain decimal string, below the BN254
 * modulus; anything else (signs, whitespace, other prefixes, non-strings) is rejected.
 */
export function canonicalPublicOutputs(outputs: unknown, format: PublicOutputFormat): string[] {
  if (!Array.isArray(outputs)) throw new Error("public outputs are not an array");
  return outputs.map((x, i) => {
    if (typeof x !== "string" || !/^(0x[0-9a-fA-F]{1,64}|[0-9]{1,78})$/.test(x)) {
      throw new Error(`public output ${i} is not a hex or decimal field element`);
    }
    const v = BigInt(x);
    if (v >= BN254_FIELD_MODULUS)
      throw new Error(`public output ${i} is not below the field modulus`);
    return format === "hex" ? "0x" + v.toString(16).padStart(64, "0") : v.toString(10);
  });
}

/** A byte output slot. REASON: the whole value is read (not its last hex digits); > 0xff isn't a byte. */
export function fieldToByte(field: string): number {
  const v = BigInt(field);
  if (v < 0n || v > 0xffn) throw new Error("byte output out of range");
  return Number(v);
}

/** A length output slot, as a safe integer. */
export function fieldToLength(field: string): number {
  const v = BigInt(field);
  if (v < 0n || v > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("length output out of range");
  return Number(v);
}

/**
 * Text of a BoundedVec<u8, N> output (N byte slots followed by its length).
 *
 * REASON: decode by the committed length, as UTF-8 over all bytes at once. The previous decoder
 * converted each slot separately: a byte below 0x10 (e.g. tab, newline) decoded to nothing, a
 * multi-byte UTF-8 character became replacement characters, and slots past the length were
 * concatenated in.
 */
export function decodeBoundedVecText(byteSlots: readonly string[], lengthSlot: string): string {
  const len = fieldToLength(lengthSlot);
  if (len > byteSlots.length)
    throw new Error("committed length exceeds the output's maximum length");
  const bytes = Uint8Array.from(byteSlots.slice(0, len), fieldToByte);
  return new TextDecoder().decode(bytes);
}

// NOTE: hashed regex outputs are numbers; the same value may be spelled in hex or decimal
// depending on who produced publicData, so numeric strings also match by value.
const asNumber = (x: unknown): bigint | null => {
  if (typeof x !== "string" || !/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(x)) return null;
  return BigInt(x);
};
const sameValue = (a: unknown, b: unknown) => {
  if (a === b) return true;
  const na = asNumber(a);
  return na !== null && na === asNumber(b);
};
const sameStrings = (a: unknown, b: unknown) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((x, i) => sameValue(x, b[i]));

/**
 * True if `claimed` (e.g. a proof's publicData, which travels next to the proof and is not
 * checked by the proof system) is exactly the data decoded from the verified outputs.
 */
export function publicDataMatches(
  claimed: { [key: string]: unknown } | undefined,
  decoded: { [key: string]: string[] }
): boolean {
  if (!claimed) return true;
  const keys = new Set([...Object.keys(claimed), ...Object.keys(decoded)]);
  for (const k of keys) {
    if (!sameStrings(claimed[k], decoded[k])) return false;
  }
  return true;
}

/** Minimal shape of a decomposed regex needed to walk a proof's regex outputs. */
interface RegexOutputLayout {
  name: string;
  isHashed?: boolean;
  maxMatchLength?: number;
  parts: { isPublic?: boolean; maxLength?: number }[];
}

/** Number of public fields an external input of `maxLength` bytes occupies (31 bytes per field). */
export const externalInputSignalLength = (maxLength: number) => Math.ceil(maxLength / 31);

/**
 * Index of the first regex output of a Noir blueprint proof:
 * [pubkey hash, email nullifier, header hash hi, header hash lo, prover address, ...external inputs].
 */
export function noirRegexOutputsStart(externalInputs: { maxLength: number }[] = []): number {
  return 5 + externalInputs.reduce((n, e) => n + externalInputSignalLength(e.maxLength), 0);
}

/**
 * Revealed regex parts of a Noir blueprint proof, decoded from canonical ("hex") outputs.
 * Each public part is a BoundedVec<u8, maxLength> (byte slots, then its length); a hashed regex
 * contributes one field per part.
 */
export function decodeNoirRegexOutputs(
  outputs: readonly string[],
  decomposedRegexes: readonly RegexOutputLayout[],
  start: number
): { [name: string]: string[] } {
  let at = start;
  const take = (n: number) => {
    if (at + n > outputs.length)
      throw new Error("public outputs are shorter than the blueprint's layout");
    const slice = outputs.slice(at, at + n);
    at += n;
    return slice;
  };
  const out: { [name: string]: string[] } = {};
  for (const regex of decomposedRegexes) {
    const parts: string[] = [];
    for (const part of regex.parts) {
      if (regex.isHashed) {
        parts.push(take(1)[0]);
      } else if (part.isPublic) {
        // Use part's maxLength if available, otherwise fall back to decomposedRegex's maxMatchLength
        const maxLength = part.maxLength ?? regex.maxMatchLength;
        if (!maxLength) {
          throw new Error(
            "No maxLength found for public part. Either part.maxLength or decomposedRegex.maxMatchLength must be defined"
          );
        }
        const bytes = take(maxLength);
        parts.push(decodeBoundedVecText(bytes, take(1)[0]));
      }
    }
    out[regex.name] = parts;
  }
  return out;
}
