// Copy of @zk-email/helper
// @zk-email/helpers has packages using git, not supported by some js frameworks
import * as poseidon from "poseidon-lite";

export async function poseidonLarge(input: bigint, numChunks: number, bitsPerChunk: number) {
  const pubkeyChunked = bigIntToChunkedBytes(input, bitsPerChunk, numChunks);

  // @ts-ignore
  const poseidonFunc = poseidon[`poseidon${pubkeyChunked.length}`];
  return poseidonFunc(pubkeyChunked);
}

function bigIntToChunkedBytes(num: BigInt | bigint, bytesPerChunk: number, numChunks: number) {
  const res = [];
  const bigintNum: bigint = typeof num === "bigint" ? num : num.valueOf();
  const msk = (1n << BigInt(bytesPerChunk)) - 1n;
  for (let i = 0; i < numChunks; ++i) {
    res.push(((bigintNum >> BigInt(i * bytesPerChunk)) & msk).toString());
  }
  return res;
}

export async function sha256Hash(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Use Web Crypto API for browsers
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Use Node.js Web Crypto API
  if (typeof process !== "undefined" && process.versions?.node) {
    const { subtle } = require("crypto").webcrypto;
    const hashBuffer = await subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  throw new Error("SHA-256 hashing is not supported in this environment.");
}
