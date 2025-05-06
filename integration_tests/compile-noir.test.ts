import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import zkeSdk, { BlueprintProps, Status, testBlueprint, ZkFramework } from "../src";
import { initNoirWasm } from "../src/initNoirWasm.ts";
import { readFile } from "fs/promises";

const sdk = zkeSdk({
  auth: {
    getToken: async () =>
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDg1MzEzNjcsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.WaH7hKR_b7AGOsPzJCUcsM0D0C2t8o8JLn-cFLJwmyM",
    onTokenExpired: async () => {},
  },
  baseUrl: "http://127.0.0.1:8080",
});

describe("Compile noir test suite", async () => {
  const residency = await readFile("emls/residency.eml", "utf-8");

  // test("compile residency", async () => {
  //   const props: BlueprintProps = {
  //     title: "Sp1Residency",
  //     description: "Sp1Residency",
  //     circuitName: "sp1_residency",
  //     ignoreBodyHashCheck: true,
  //     emailHeaderMaxLength: 896,
  //     githubUsername: "DimiDumo",
  //     senderDomain: "succinct.xyz",
  //     decomposedRegexes: [
  //       {
  //         name: "subject",
  //         parts: [
  //           { isPublic: true, regexDef: "Welcome " },
  //           { isPublic: true, regexDef: "to the Succinct ZK Residency!" },
  //           // { isPublic: false, regexDef: "Succinct ZK Residency!" },
  //         ],
  //         location: "header",
  //         maxLength: 50,
  //       },
  //     ],
  //   };

  //   const blueprint = sdk.createBlueprint(props);
  //   blueprint.props.zkFramework = ZkFramework.Noir;

  //   const output = await testBlueprint(residency, blueprint.props);
  //   console.log("output: ", output);

  //   console.log("submitting blueprint");
  //   await blueprint.submit();

  //   await new Promise((r) => setTimeout(r, 1000));

  //   expect(await blueprint.checkStatus()).toBe(Status.InProgress);

  //   while ((await blueprint.checkStatus()) === Status.InProgress) {}

  //   expect(blueprint.props.status).toBe(Status.Done);

  //   const prover = blueprint.createProver({ isLocal: true });
  //   console.log("got prover: ", prover);

  //   const noirWasm = await initNoirWasm();
  //   const options = { noirWasm };
  //   console.log("got noirWasm");

  //   const proof = await prover.generateProof(residency, [], options);
  //   console.log("proof: ", proof);
  //   const verified = await proof.verify();
  //   console.log("proof verified: ", verified);
  // }, 180_000);

  test("compile apple", async () => {
    const oldBlueprint = await sdk.getBlueprintById("64d8300f-00f1-442b-8b7c-9df12e314598");

    const props = oldBlueprint.getClonedProps();

    props.zkFramework = ZkFramework.Noir;

    console.log("props: ", props);
    delete props.status;
    delete props.id;

    const blueprint = sdk.createBlueprint(props);

    await blueprint.submit();

    await new Promise((r) => setTimeout(r, 1000));

    expect(await blueprint.checkStatus()).toBe(Status.InProgress);

    while ((await blueprint.checkStatus()) === Status.InProgress) {}

    expect(blueprint.props.status).toBe(Status.Done);

    const prover = blueprint.createProver({ isLocal: true });
    console.log("got prover: ", prover);

    const noirWasm = await initNoirWasm();
    const options = { noirWasm };
    console.log("got noirWasm");

    const proof = await prover.generateProof(residency, [], options);
    console.log("proof: ", proof);
    const verified = await proof.verify();
    console.log("proof verified: ", verified);
  }, 180_000);
});
