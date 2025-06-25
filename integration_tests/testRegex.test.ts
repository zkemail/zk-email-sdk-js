import { test, describe } from "bun:test";
import zkeSdk, { testBlueprint } from "../src";
import { readFile } from "fs/promises";
const sdk = zkeSdk({
  baseUrl: "https://staging-conductor.zk.email",
  // auth: {
  //   getToken: async () =>
  //     // Token only usable locally
  //     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTI4MTg5MjUsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.72CrX3j0A2f3ZGZM5Ca6GnXo3_xRceryn_KsOTH8gW4",
  //   onTokenExpired: async () => {},
  // },
});
// const sdk = zkeSdk({ logging: { enabled: true, level: "debug" } });

describe("Test decomposed regex", () => {
  test("test dcr", async () => {
    // const emlTxt = await readFile("emls/x.eml", "utf-8");
    const blueprint = await sdk.getBlueprintById("b31e09ef-86fa-4a70-a062-e016a8780af8");
    const emlTxt = await readFile("emls/x.eml", "utf-8");
    // const blueprint = await sdk.getBlueprintById("f9de1c4a-b90c-47af-941f-d21a0ecf1411");
    // const blueprint = await sdk.getBlueprintById("e632e06b-2cb9-4ad3-9bf6-7a5df9479a3c");
    // await blueprint.submit();

    try {
      const res = await testBlueprint(emlTxt, blueprint.props);
      console.log("res: ", res);
    } catch (err) {
      console.error("error in testBlueprint: ", err);
    }

    // const prover = blueprint.createProver();
    // const proof = await prover.generateProof(emlTxt)
    // console.log("proof: ", proof);
  }, 120_000);
});
