import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import pg from "pg";
import { Blueprint, BlueprintProps, createBlueprint, Status } from "../src";
import emlTxt from "./airbnb_eml";
import { ProofStatus } from "../src/types/proof";
import { Proof } from "../src/proof";

function getBlueprintProps(
  title = "Twitter",
  slug = "zkemail/twitter",
  description?: string,
  tags?: string
): BlueprintProps {
  return {
    title,
    slug,
    description,
    tags,
    decomposedRegexes: [
      {
        parts: [
          {
            isPublic: true,
            regexDef: "(a-zA-Z0-9_)+",
          },
        ],
        name: "body",
        maxLength: 256,
        location: "body",
      },
    ],
  };
}

describe("Proof test suite", async () => {
  let db: pg.Client;
  let blueprint: Blueprint;
  const blueprintIds: string[] = [];
  const proofIds: string[] = [];

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
  blueprint = createBlueprint(props);
  await blueprint.submit();

  while (![Status.Done, Status.Failed].includes(await blueprint.checkStatus())) {}

  if ((await blueprint.checkStatus()) === Status.Failed) {
    throw new Error("Couldn't initialize Blueprint");
  }

  const blueprintId = blueprint.getId();
  blueprintIds.push(blueprintId!);

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
      const proover = blueprint.createProver();
      const proof = await proover.generateProof(emlTxt);

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
        expect(fetchedProof.props.circuitInput).toBe(emlTxt);
      });

      test("Download files", async () => {
        proof.props.id = "some-id-1";
        const url = await proof.getProofDataDownloadLink();
        expect(url).not.toBeNull();
      });
    });
  });
});
