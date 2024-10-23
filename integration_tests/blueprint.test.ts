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
  slug?: string,
  description?: string,
  tags?: string
): BlueprintProps {
  return {
    title,
    slug: slug || ("zkemail/twitter" + Math.random()).replace("0.", ""),
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
      expect(blueprint.props.version).toBe(1);
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

    test("Can create a new version of a blueprint as draft", async () => {
      const props = getBlueprintProps();
      const blueprint = createBlueprint(props);
      await blueprint.submitDraft();
      const blueprintId = blueprint.getId();
      expect(blueprintId).not.toBeNull();
      blueprintIds.push(blueprintId!);
      expect(blueprint.props.version).toBe(1);

      const savedProps = blueprint.getClonedProps();
      expect(savedProps).not.toBeUndefined();
      savedProps.title = "Twitter 2";

      await blueprint.submitNewVersionDraft(savedProps);
      const newBlueprintId = blueprint.getId();
      expect(newBlueprintId).not.toBeNull();
      expect(newBlueprintId).not.toBe(blueprintId);
      blueprintIds.push(newBlueprintId!);
      expect(blueprint.props.title).toBe("Twitter 2");
      expect(blueprint.props.version).toBe(2);
    });

    test("Can update blueprint in draft", async () => {
      const props = getBlueprintProps();
      const blueprint = createBlueprint(props);
      await blueprint.submitDraft();
      const blueprintId = blueprint.getId();
      expect(blueprintId).not.toBeNull();
      blueprintIds.push(blueprintId!);
      expect(blueprint.props.version).toBe(1);

      const savedProps = blueprint.getClonedProps();
      expect(savedProps).not.toBeUndefined();
      savedProps.title = "Twitter 2";

      await blueprint.update(savedProps);
      const newBlueprintId = blueprint.getId();
      expect(newBlueprintId).not.toBeNull();
      expect(newBlueprintId).toBe(blueprintId);
      expect(blueprint.props.title).toBe("Twitter 2");
      expect(blueprint.props.version).toBe(1);
    });

    test("List versions of blueprint from Blueprint Class", async () => {
      const props = getBlueprintProps();
      const blueprint = createBlueprint(props);
      await blueprint.submitDraft();
      const blueprintId = blueprint.getId();
      expect(blueprintId).not.toBeNull();
      blueprintIds.push(blueprintId!);
      expect(blueprint.props.version).toBe(1);

      const allBps: Blueprint[] = [structuredClone(blueprint)];

      for (let i = 2; i < 5; i++) {
        const savedProps = blueprint.getClonedProps();
        expect(savedProps).not.toBeUndefined();
        savedProps.title = `Twitter ${i}`;

        await blueprint.submitNewVersionDraft(savedProps);
        const newBlueprintId = blueprint.getId();
        expect(newBlueprintId).not.toBeNull();
        expect(newBlueprintId).not.toBe(blueprintId);
        expect(blueprint.props.title).toBe(`Twitter ${i}`);
        expect(blueprint.props.version).toBe(i);
        allBps.push(structuredClone(blueprint));
      }

      const allVersions = await blueprint.listAllVersions();
      expect(Bun.deepEquals(allVersions, allBps)).toBeTrue();
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

      test("Only latest versions of blueprints are listed", async () => {
        // Prevent race condition with normal listing test, since we are changin the same blueprints
        await new Promise((r) => setTimeout(r, 300));
        const blueprint = blueprints[0];
        const blueprintId = blueprint.getId();

        const newProps = blueprint.getClonedProps();
        newProps.title = "Twitter 3";

        // Create new version
        await blueprint.submitNewVersionDraft(newProps);
        const newBlueprintId = blueprint.getId();
        expect(newBlueprintId).not.toBeNull();
        expect(newBlueprintId).not.toBe(blueprintId);
        blueprintIds.push(newBlueprintId!);
        expect(blueprint.props.title).toBe("Twitter 3");
        expect(blueprint.props.version).toBe(2);

        // List blueprints should now include the new blueprintId but not the old one
        const newBlueprints = await listBlueprints();
        const newBlueprintIds = newBlueprints.map((bp) => bp.getId());
        const includesNew = newBlueprintIds.includes(newBlueprintId);
        expect(includesNew).toBeTrue();
        const includesOld = newBlueprintIds.includes(blueprintId);
        expect(includesOld).toBeFalse();
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

      test("Can't update compiled blueprint", async () => {
        // Avoid race conditions
        await new Promise((r) => setTimeout(r, 1_300));

        const status = await blueprint.checkStatus();

        expect(status).not.toBeNull();
        expect(status).toBe(Status.Done);

        const savedProps = blueprint.getClonedProps();
        expect(savedProps).not.toBeUndefined();
        savedProps.title = "Twitter 2";

        try {
          await blueprint.update(savedProps);
        } catch (err) {
          expect(err).not.toBeUndefined();
          return;
        }

        throw Error("Didn't fail updating a compiled blueprint");
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
