// Copy of @zk-email/helper
// @zk-email/helpers has packages using git, not supported by some js frameworks
import { buildPoseidon } from "circomlibjs";

export async function poseidonLarge(input: bigint, numChunks: number, bitsPerChunk: number) {
  const poseidon = await buildPoseidon();
  const pubkeyChunked = bigIntToChunkedBytes(input, bitsPerChunk, numChunks);
  const hash = poseidon(pubkeyChunked);

  return poseidon.F.toObject(hash) as Promise<bigint>;
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
