import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import pg from "pg";
import {
  Blueprint,
  BlueprintProps,
  createBlueprint,
  getBlueprint,
  listBlueprints,
  Proof,
  Status,
} from "../src";

//TODO: test while (await checkStatu())

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

describe("Blueprint test suite", async () => {
  let db: pg.Client;
  const blueprintIds: string[] = [];

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

  afterAll(async () => {
    try {
      console.log("Cleaning up db");
      await db.query("DELETE FROM blueprints WHERE id = ANY($1::uuid[])", [blueprintIds]);
      console.log("Cleanup db successfull");
    } catch (err) {
      console.error("Failed to cleanup db: ", err);
    }
  });

  describe("Basic CRUD tests", () => {
    test("Can create blueprint and submit draft", async () => {
      const props = getBlueprintProps();
      const blueprint = createBlueprint(props);
      await blueprint.submitDraft();
      const blueprintId = blueprint.getId();
      expect(blueprintId).not.toBeNull();
      blueprintIds.push(blueprintId!);
    });

    test("Can get existing blueprint", async () => {
      const props = getBlueprintProps();
      const blueprint = createBlueprint(props);
      await blueprint.submitDraft();
      const blueprintId = blueprint.getId();
      expect(blueprintId).not.toBeNull();
      blueprintIds.push(blueprintId!);

      const retreivedBlueprint = await getBlueprint(blueprintId!);
      const retreivedBlueprintId = retreivedBlueprint.getId();
      expect(retreivedBlueprintId).not.toBeNull();
      expect(retreivedBlueprintId).toBe(blueprintId);
    });

    describe("Can list blueprints", async () => {
      const localBlueprintIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const props = getBlueprintProps();
        const blueprint = createBlueprint(props);
        await blueprint.submitDraft();
        const blueprintId = blueprint.getId();
        expect(blueprintId).not.toBeNull();
        localBlueprintIds.push(blueprintId!);
        blueprintIds.push(blueprintId!);
      }

      const blueprints = await listBlueprints();

      test("Submitted blueprints are listed", async () => {
        expect(blueprints.length).toBeGreaterThanOrEqual(3);
        const listedBlueprintIds = blueprints.map((bp) => bp.getId());

        // Check if
        for (const localBlueprintId of localBlueprintIds) {
          expect(localBlueprintId).not.toBeNull();
          const included = listedBlueprintIds.includes(localBlueprintId!);
          expect(included).toBe(true);
        }
      });

      test("Blueprints returned are of type Blueprint", async () => {
        for (const blueprint of blueprints) {
          expect(blueprint instanceof Blueprint).toBe(true);
        }
      });
    });

    describe("Can search by text for blueprints", async () => {
      const localBlueprintIds: string[] = [];

      const blueprintProps = [
        getBlueprintProps(
          "Proof of Github Username",
          "divine_economy/github",
          "Prove you own a Github username",
          "github,username,identity"
        ),
        getBlueprintProps(
          "Proof of Instagram Handle",
          "zkemail/proof-of-instagram-handle",
          "Use a password reset email to proof you own the email connected to a instagram handle.",
          "email,identity,social"
        ),
        getBlueprintProps(
          "Proof of ETH Price",
          "strobe/proof-of-price",
          "price alert emails for eth price",
          "eth,price,oracle"
        ),
      ];

      for (const props of blueprintProps) {
        const blueprint = createBlueprint(props);
        await blueprint.submitDraft();
        const blueprintId = blueprint.getId();
        expect(blueprintId).not.toBeNull();
        localBlueprintIds.push(blueprintId!);
        blueprintIds.push(blueprintId!);
      }

      test("Text search on multiple text fields case insensitive", async () => {
        const blueprints = await listBlueprints({ search: "GITHUB" });
        const listedBlueprintIds = blueprints.map((bp) => bp.getId());
        const included = listedBlueprintIds.includes(localBlueprintIds[0]);
        expect(included).toBe(true);
      });

      test("Text search on single text fields", async () => {
        const blueprints = await listBlueprints({ search: "oracle" });
        const listedBlueprintIds = blueprints.map((bp) => bp.getId());
        const included = listedBlueprintIds.includes(localBlueprintIds[2]);
        expect(included).toBe(true);
      });

      test("Text search for multiple results", async () => {
        const blueprints = await listBlueprints({ search: "email" });

        const listedBlueprintIds = blueprints.map((bp) => bp.getId());
        const included = listedBlueprintIds.every((bId) => localBlueprintIds.includes(bId!));
        expect(included).toBe(true);
      });
    });
  });

  // TODO: make sure these tests don't start an actual compilation
  describe("Compilation tests", () => {
    describe("Can submit blueprint after initialization", async () => {
      const props = getBlueprintProps();
      const blueprint = createBlueprint(props);
      await blueprint.submit();

      test("Should save blueprint", async () => {
        const blueprintId = blueprint.getId();
        expect(blueprintId).not.toBeNull();
        blueprintIds.push(blueprintId!);
      });

      test("Status should initially be Draft", async () => {
        const status = blueprint.props.status;
        expect(status).not.toBeNull();
        expect(status).toBe(Status.Draft);
      });

      test("Status should be InProgress after checkStatus", async () => {
        // Avoid race conditions
        await new Promise((r) => setTimeout(r, 300));

        const status = await blueprint.checkStatus();

        expect(status).not.toBeNull();
        expect(status).toBe(Status.InProgress);
      });

      test("Status should be Done after 1 second", async () => {
        // Avoid race conditions
        await new Promise((r) => setTimeout(r, 1_300));

        const status = await blueprint.checkStatus();

        expect(status).not.toBeNull();
        expect(status).toBe(Status.Done);
      });
    });
  });

  describe("Download zkeys", () => {
    test("getZKeyDownloadLink on dummy id should return a download url", async () => {
      const props = getBlueprintProps();
      const blueprint = createBlueprint(props);
      // Set dummy id for the file download
      blueprint.props.id = "some-id-1";
      blueprint.props.status = Status.Done;
      const url = await blueprint.getZKeyDownloadLink();
      expect(url).not.toBeNull();
    });
  });
});

describe("On chain verification", () => {
  // TODO: remove test once implemented
  test("Test connectivity to chain by calling WETH", async () => {
    const props = getBlueprintProps();
    const blueprint = createBlueprint(props);
    // Set dummy id for the file download
    blueprint.props.status = Status.Done;
    const proof = {} as Proof;
    await blueprint.verifyProofOnChain(proof);
  });
});
