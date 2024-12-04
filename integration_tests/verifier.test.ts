import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import zkeSdk from "../src";
import { verifyProofOnChain } from "../src/chain";

describe("On chain verification", () => {
  const { getProof } = zkeSdk();
  test("Verify proof on chain", async () => {
    const proof = await getProof("d936fbc1-fc3a-4573-8f4d-b6acfb1d05c2");

    await verifyProofOnChain(proof);
  });
});
