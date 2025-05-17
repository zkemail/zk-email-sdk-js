import { expect, test, describe, beforeAll, afterAll } from "bun:test";
// import pg from "pg";
import zkeSdk, { BlueprintProps, ZkFramework } from "../src";
import { readFile } from "fs/promises";

const sdk = zkeSdk({
  auth: {
    getToken: async () =>
      "",
    onTokenExpired: async () => {},
  },
  baseUrl: "https://dev-conductor.zk.email",
  // baseUrl: "http://127.0.0.1:8080",
});

describe("Blueprint 2 test suite", async () => {
  const residency = await readFile("emls/residency.eml", "utf-8");
  const cleanupBlueprintIds: string[] = [];

  test("Create server side proof", async () => {
    const blueprint = await sdk.getBlueprintById("cd38535c-6e86-4f50-b7a5-ae15f834eaf7");
    console.log("blueprint: ", blueprint);
    const prover = blueprint.createProver();
    const proof = await prover.generateProof(residency);
    console.log("proof: ", proof);
  }, 120_000);

  test("Should assign correct zk framework", async () => {
    const hipster = await readFile("emls/hipster2.eml", "utf-8");
    const props: BlueprintProps = {
      title: "Hipster",
      description: "Hipster test text",
      circuitName: "hipster",
      ignoreBodyHashCheck: false,
      emailBodyMaxLength: 32_000,
      emailHeaderMaxLength: 1024,
      githubUsername: "DimiDumo",
      senderDomain: "gmail.com",
      decomposedRegexes: [
        {
          name: "normal",
          maxLength: 1024,
          location: "body",
          parts: [
            {
              isPublic: false,
              regexDef: "gastropub ",
            },
            {
              isPublic: true,
              regexDef: "master",
            },
            {
              isPublic: false,
              regexDef: " cleanse",
            },
          ],
        },
      ],
    };

    const blueprint = sdk.createBlueprint(props);
    await blueprint.assignPreferredZkFramework(hipster);
    expect(blueprint.props.serverZkFramework).toBe(ZkFramework.Sp1);
  }, 20_000);

  // This test can only be verified manually, since it takes too long
  test("Should fail and change zk framework", async () => {
    const props: BlueprintProps = {
      title: "Hipster unique new one",
      description: "Hipster test text",
      slug: "dimidumo/hipster-new-one",
      circuitName: "hiptest",
      ignoreBodyHashCheck: false,
      emailBodyMaxLength: 32_000,
      emailHeaderMaxLength: 1024,
      githubUsername: "DimiDumo",
      senderDomain: "gmail.com",
      decomposedRegexes: [
        {
          name: "normal",
          maxLength: 1024,
          location: "body",
          parts: [
            {
              isPublic: false,
              regexDef: "blue ",
            },
            {
              isPublic: true,
              regexDef: "bottle",
            },
            {
              isPublic: false,
              regexDef: " chicharrones",
            },
          ],
        },
        {
          name: "multiple alternating",
          maxLength: 1024,
          location: "body",
          parts: [
            {
              isPublic: false,
              regexDef: "tote ",
            },
            {
              isPublic: true,
              regexDef: "bag",
            },
            {
              isPublic: false,
              regexDef: " franzen ",
            },
            {
              isPublic: true,
              regexDef: "vice",
            },
            {
              isPublic: false,
              regexDef: " asymmetrical",
            },
          ],
        },
        {
          name: "multiple in a row",
          maxLength: 1024,
          location: "body",
          parts: [
            {
              isPublic: false,
              regexDef: "asymmetrical ",
            },
            {
              isPublic: true,
              regexDef: "jianbing ",
            },
            {
              isPublic: true,
              regexDef: "vegan ",
            },
            {
              isPublic: false,
              regexDef: "four",
            },
          ],
        },
        {
          name: "public only",
          maxLength: 1024,
          location: "body",
          parts: [
            {
              isPublic: true,
              regexDef: "raclette ",
            },
            {
              isPublic: true,
              regexDef: "air",
            },
          ],
        },
      ],
      clientZkFramework: ZkFramework.Circom,
      serverZkFramework: ZkFramework.Circom,
      verifierContract: {
        chain: 84532,
      },
    };

    const blueprint = sdk.createBlueprint(props);
    await blueprint.submit();
  }, 60_000);

  test("update blueprint", async () => {
    const blueprint = await sdk.getBlueprintById("d6e290c0-d60f-493d-a4cc-d2c0e6d56f0a");
    const newProps = blueprint.getClonedProps();
    newProps.description = "a new one";
    await blueprint.update(newProps);
  });

  afterAll(async () => {
    console.log("deleting blueprints");
  });
});
