import { test, describe, expect } from "bun:test";
import zkeSdk, { BlueprintProps } from "../src";
import { readFile } from "fs/promises";

const sdk = zkeSdk({
  baseUrl: "http://127.0.0.1:8080",
  auth: {
    getToken: async () =>
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDUxNTQxMTUsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.0rbt9d2o-BSPQYjLk0GV7FbtjURuLCQY1m04EOxSoAM",
    onTokenExpired: async () => {},
  },
});

describe("fix testing", async () => {
  test("local test", async () => {
    const props: BlueprintProps = {
      ignoreBodyHashCheck: true,
      isPublic: true,
      status: 4,
      title: "dimi test - rute pattern",
      description: "Playground - Testing twitter issue",
      slug: "rutefig/mock3",
      emailQuery: "from:x.com",
      circuitName: "mock3",
      emailHeaderMaxLength: 1280,
      removeSoftLinebreaks: true,
      githubUsername: "rutefig",
      senderDomain: "x.com",
      zkFramework: 1,
      decomposedRegexes: [
        {
          parts: [
            { isPublic: false, regexDef: "(^|\r\n)(to:)([^<\r\n]*?<)?" },
            { isPublic: true, regexDef: "([A-Za-z0-9!#$%&'*+=?\\\\-\\\\^_`{|}~.\\/@]{3})" },
            { isPublic: false, regexDef: "[^@]*@[a-zA-Z0-9.-]+>?\r\n" },
          ],
          name: "email_recipient_first_three",
          maxLength: 64,
          location: "header",
        },
      ],
    };

    const blueprint = sdk.createBlueprint(props);
    await blueprint.submit();
  });
});

describe("fix proving", async () => {
  const ethDenver = await readFile("emls/hipster.eml", "utf-8");
  const sdk = zkeSdk();

  test("eth denver proof", async () => {
    try {
      const blueprint = await sdk.getBlueprintById("a41eaba7-1e12-407f-979c-4f3f6c3339a2");
      console.log("blueprint: ", blueprint);
      const prover = blueprint.createProver();
      const proof = await prover.generateProof(ethDenver, [
        { name: "luma_code", value: "the code", maxLength: 64 },
      ]);
      console.log("proof: ", proof);
    } catch (err) {
      console.log("Failed: ", err);
    }
  }, 300_000);
});
