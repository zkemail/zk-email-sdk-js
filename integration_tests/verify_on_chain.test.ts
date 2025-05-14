import { test, describe, expect } from "bun:test";
import zkeSdk from "../src";

const sdk = zkeSdk({ baseUrl: "https://dev-conductor.zk.email" });

describe("on chain verification test suite", () => {
  test("", async () => {
    const proof = await sdk.getProof("beac520f-6e3d-493a-ab03-7e6989f38d10");
    console.log("proof: ", proof);
    const result = await proof.verifyOnChain();
    console.log("result: ", result);
  });
});
