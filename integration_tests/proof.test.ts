import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import pg from "pg";
import sdk, { Blueprint, BlueprintProps, Status } from "../src";
import { ProofStatus } from "../src/types/proof";
import { Proof } from "../src/proof";
import { getAuthToken } from "./test-utils";
import { Auth } from "../src/types/auth";
import { readFile } from "fs/promises";

function getBlueprintProps(
  title = "Twitter",
  circuitName?: string,
  description?: string,
  tags?: string[]
): BlueprintProps {
  return {
    title,
    circuitName: circuitName || ("twitter" + Math.random()).replace("0.", ""),
    description,
    tags,
    decomposedRegexes: [
      {
        parts: [
          {
            isPublic: true,
            regexDef: "Hi",
          },
          {
            isPublic: true,
            regexDef: "!",
          },
        ],
        name: "hi",
        maxLength: 64,
        location: "body",
      },
    ],
    emailHeaderMaxLength: 2816,
    emailBodyMaxLength: 1024,
    ignoreBodyHashCheck: false,
    removeSoftLinebreaks: true,
  };
}

describe("Proof test suite", async () => {
  // TODO: Figure out a way to run these test with current conductor verion
  let db: pg.Client;
  let blueprint: Blueprint;
  const blueprintIds: string[] = [];
  const proofIds: string[] = [];

  console.log("getting auth token");
  const token = await getAuthToken();
  console.log("got token: ", token);

  const auth: Auth = {
    getToken: async () => token,
    onTokenExpired: async () => {},
  };

  const { createBlueprint } = sdk({ auth });

  console.log("Setting up user database...");
  const { Client } = pg;
  const client = new Client({
    user: "emailwallet",
    password: "p@ssw0rd",
    host: "localhost",
    port: 5432,
    database: "sdk",
  });
  await client.connect();
  db = client;
  console.log("Database setup done");

  const props = getBlueprintProps();
  console.log("got props");
  blueprint = createBlueprint(props);
  console.log("created blueprint");
  await blueprint.submitDraft();
  console.log("submitted blueprint");

  // while (![Status.Done, Status.Failed].includes(await blueprint.checkStatus())) {}
  console.log("wait for status done");

  // if ((await blueprint.checkStatus()) === Status.Failed) {
  //   throw new Error("Couldn't initialize Blueprint");
  // }

  const blueprintId = blueprint.getId();
  blueprintIds.push(blueprintId!);

  const emlTxt = await readFile("unit_tests/test.eml", "utf-8");

  afterAll(async () => {
    try {
      console.log("Cleaning up db");
      await db.query("DELETE FROM blueprints WHERE id = ANY($1::uuid[])", [blueprintIds]);
      await db.query("DELETE FROM proofs WHERE id = ANY($1::uuid[])", [proofIds]);
      console.log("Cleanup db successfull");
    } catch (err) {
      console.error("Failed to cleanup db: ", err);
    }
  });

  describe("Basic CRUD tests", () => {
    describe("Can create proof", async () => {
      console.log("starting create proof flow====================");
      const prover = blueprint.createProver();
      console.log("got prover: ");
      const proof = await prover.generateProof(emlTxt);
      console.log("got proof");

      test("Using generateProof, proof should be done", async () => {
        const status = await proof.checkStatus();
        expect(status).toBe(ProofStatus.Done);
      });

      test("Proof must have id", async () => {
        const id = proof.getId();
        expect(id).not.toBeNull();
        proofIds.push(id);
      });

      test("Get fetch created proof", async () => {
        const id = proof.getId();
        const fetchedProof = await Proof.getPoofById(id);
        expect(fetchedProof.getId()).toBe(id);
        expect(fetchedProof.props.startedAt instanceof Date).toBe(true);
        // expect(fetchedProof.props.input).toBe(emlTxt);
      });

      test("Download files", async () => {
        proof.props.id = "some-id-1";
        const url = await proof.getProofDataDownloadLink();
        expect(url).not.toBeNull();
      });
    });
  });
});

describe("Proof suite no auth", () => {
  test("Get proof hashes", async () => {
    const { getProof } = sdk();
    const proof = await getProof("da56d824-4920-415e-8b32-e3c5b886c826");
    const headerHash = proof.getHeaderHash();
    expect(headerHash[0]).toBe(
      "12421518966169864696647489187550758355845786139247225534357274307185098105625"
    );
    expect(headerHash[1]).toBe("188603216623945328674982261041175035792");
  });

  test("Get proof subject output", async () => {
    const { getProof } = sdk();
    const proof = await getProof("305b3981-b8bf-44a3-a48e-03bc36abba3a");
    expect(proof.props?.publicData?.subject[0]).toBe(
      "[Bybit]Identity Verification Lv. 1 Has Been Approved"
    );

    console.log("subject: ", proof.props?.publicData?.subject[0]);
  });
});
