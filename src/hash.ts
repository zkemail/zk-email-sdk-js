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
