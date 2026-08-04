import { test, describe, expect } from "bun:test";
import zkeSdk from "../src";
import { readFile } from "fs/promises";

const sdk = zkeSdk({
  baseUrl: "https://staging-conductor.zk.email",
  // baseUrl: "http://127.0.0.1:8080",
  logging: { enabled: true, level: 'debug' }
});

describe("test sp1 amazon", () => {
  test("prove", async () => {
    const eml = await readFile("emls/amazon_4.eml", "utf-8");
    const blueprint = await sdk.getBlueprintById("1fc25bf2-bfce-430f-9d0e-447a02cc7864");
    const prover = blueprint.createProver();
    try {
      const proof = await prover.generateProof(eml)
      console.log("proof: ", proof);
    } catch (err) {
      console.error("Failed to generate proof: ", err);
    }
  }, 120_000)
})
