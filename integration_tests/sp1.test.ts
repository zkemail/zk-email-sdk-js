import { test, describe, expect } from "bun:test";
import zkeSdk, {
  Blueprint,
  BlueprintProps,
  ProofStatus,
  Status,
  testBlueprint,
  ZkFramework,
} from "../src";
import { readFile } from "fs/promises";

// local use only
const authToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDQ3ODQ3NjksImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.aU4I_nAnkIi9_9YU6z-mAakv2PaM-VX1Aa8G1DRUTXU";
describe("Sp1 test suite", async () => {
  // const sdk = zkeSdk({
  //   auth: {
  //     getToken: async () => authToken,
  //     onTokenExpired: async () => {},
  //   },
  //   baseUrl: "http://127.0.0.1:8080",
  // });

  const sdk = zkeSdk({
    baseUrl: "http://127.0.0.1:8080",
    auth: {
      getToken: async () => authToken,
      onTokenExpired: async () => {},
    },
  });

  const hipster = await readFile("emls/hipster.eml", "utf-8");
  const hipster2 = await readFile("emls/hipster2.eml", "utf-8");
  const residency = await readFile("emls/residency.eml", "utf-8");
  const uber = await readFile("emls/uber.eml", "utf-8");

  test("Should start a sp1 proof", async () => {
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
    };

    console.log("creating blueprint");
    const blueprint = sdk.createBlueprint(props);

    blueprint.props.zkFramework = ZkFramework.Sp1;

    // console.log("assignPreferredZkFramework");
    // await blueprint.assignPreferredZkFramework(hipster);

    console.log("blueprint: ", blueprint.props.zkFramework);

    // With body length > 10,000 should assign Sp1
    // TODO: use long mail
    // expect(blueprint.props.zkFramework).toBe(ZkFramework.Sp1);

    const output = await testBlueprint(hipster, blueprint.props);
    console.log("output: ", output);

    console.log("submitting blueprint");
    await blueprint.submit();

    await new Promise((r) => setTimeout(r, 500));

    console.log("checking blueprint status");
    await blueprint.checkStatus();

    // Sp1 does not need compilation, should be in status Done right away
    expect(blueprint.props.status).toBe(Status.Done);

    console.log("creating local prover");
    // Should fail creating local prover
    try {
      const prover = blueprint.createProver({ isLocal: true });
      expect(prover).toBeUndefined();
    } catch (err) {
      expect(err).toBeDefined();
    }

    console.log("creating remote prover");
    const prover = blueprint.createProver();
    console.log("generating proof");
    const proof = await prover.generateProof(hipster);

    console.log("proof done: ", proof);

    expect(proof).toBeDefined();
    expect(proof.props.status).toBe(ProofStatus.Done);

    const verified = await proof.verify();
    console.log("proof verified: ", verified);

    expect(verified).toBe(true);
  }, 600_000);

  test("Should start a sp1 proof - residency", async () => {
    const props: BlueprintProps = {
      title: "Sp1Residency",
      description: "Sp1Residency",
      circuitName: "sp1_residency",
      ignoreBodyHashCheck: true,
      emailHeaderMaxLength: 896,
      githubUsername: "DimiDumo",
      senderDomain: "succinct.xyz",
      decomposedRegexes: [
        {
          name: "subject",
          parts: [
            { isPublic: true, regexDef: "Welcome " },
            { isPublic: true, regexDef: "to the Succinct ZK Residency!" },
          ],
          location: "header",
          maxLength: 50,
        },
      ],
    };

    console.log("creating blueprint");
    const blueprint = sdk.createBlueprint(props);

    blueprint.props.zkFramework = ZkFramework.Sp1;

    // console.log("assignPreferredZkFramework");
    // await blueprint.assignPreferredZkFramework(hipster);

    console.log("blueprint: ", blueprint.props.zkFramework);

    // With body length > 10,000 should assign Sp1
    // TODO: use long mail
    // expect(blueprint.props.zkFramework).toBe(ZkFramework.Sp1);

    const output = await testBlueprint(residency, blueprint.props);
    console.log("output: ", output);

    console.log("submitting blueprint");
    await blueprint.submit();

    await new Promise((r) => setTimeout(r, 500));

    console.log("checking blueprint status");
    await blueprint.checkStatus();

    // Sp1 does not need compilation, should be in status Done right away
    expect(blueprint.props.status).toBe(Status.Done);

    console.log("creating local prover");
    // Should fail creating local prover
    try {
      const prover = blueprint.createProver({ isLocal: true });
      expect(prover).toBeUndefined();
    } catch (err) {
      expect(err).toBeDefined();
    }

    console.log("creating remote prover");
    const prover = blueprint.createProver();
    console.log("generating proof");
    const proof = await prover.generateProof(residency);

    console.log("proof done: ", proof);

    expect(proof).toBeDefined();
    expect(proof.props.status).toBe(ProofStatus.Done);

    const verified = await proof.verify();
    console.log("proof verified: ", verified);
    // ["17065011482015124977282970298439631182550457267344513671014250909064553612521","52352752354244467950513147857578709131","274064983910760223810904298937823921978","2334392307038315863","0","902461930945294469469049061864238462133168371753019686485682756284276","0","0"]
    expect(verified).toBe(true);
  }, 600_000);

  test("Should verify a proof", async () => {
    const proof = await sdk.getProof("ef69c485-fbcc-41ff-8509-28ade98bac9b");
    console.log("verifying proof: ", proof);
    const verified = await proof.verify();

    console.log("proof verified: ", verified);

    expect(verified).toBe(true);
  }, 30_000);

  test("Test prod example blueprint", async () => {
    const blueprint = await sdk.getBlueprintById("4bb958e0-935c-4b9f-a4a9-f8cbe2555d12");
    const prover = blueprint.createProver();
    const proof = await prover.generateProof(uber);
    expect(proof).toBeDefined();
    const verified = await proof.verify();
    expect(verified).toBeTrue();
  }, 300_000);
});
