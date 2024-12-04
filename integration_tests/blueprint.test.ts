import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import pg from "pg";
import sdk, { Blueprint, BlueprintProps, Proof, Status, Auth } from "../src";
import { getAuthToken } from "./test-utils";

//TODO: test while (await checkStatus())

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

  const token = await getAuthToken();

  const auth: Auth = {
    getToken: async () => token,
    onTokenExpired: async () => {},
  };

  const { createBlueprint, getBlueprint, getBlueprintById, listBlueprints, getStarredBlueprints } =
    sdk({
      auth,
      baseUrl: "http://localhost:8080",
    });

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
      expect(blueprint.props.slug).toBe(`${blueprint.props.githubUsername}/${props.circuitName}`);
    });

    test("Can get existing blueprint", async () => {
      const tags = ["massive", "slug", "blueprint"];
      const props = getBlueprintProps("Twitter", "Massive/Slug", "Got a massive slug", tags);
      const blueprint = createBlueprint(props);
      await blueprint.submitDraft();
      const blueprintId = blueprint.getId();
      expect(blueprintId).not.toBeNull();
      blueprintIds.push(blueprintId!);

      const retreivedBlueprint = await getBlueprint(blueprintId!);
      const retreivedBlueprintId = retreivedBlueprint.getId();
      expect(retreivedBlueprintId).not.toBeNull();
      expect(retreivedBlueprintId).toBe(blueprintId);
      expect(Bun.deepEquals(retreivedBlueprint.props.tags, tags)).toBeTrue();
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

      const allBps: BlueprintProps[] = [blueprint.getClonedProps()];

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
        allBps.push(blueprint.getClonedProps());
      }

      const allVersions = (await blueprint.listAllVersions()).map((b) => b.getClonedProps());
      expect(Bun.deepEquals(allVersions, allBps)).toBeTrue();
    });

    describe("Can list blueprints", async () => {
      const localBlueprintIds: string[] = [];
      let blueprints: Blueprint[];
      try {
        for (let i = 0; i < 3; i++) {
          const props = getBlueprintProps();
          const blueprint = createBlueprint(props);
          await blueprint.submitDraft();
          const blueprintId = blueprint.getId();
          expect(blueprintId).not.toBeNull();
          localBlueprintIds.push(blueprintId!);
          blueprintIds.push(blueprintId!);
        }

        blueprints = await listBlueprints();
      } catch (err) {
        console.error("Failed to initialzie list blueprint tests");
        throw new Error("All list blueprint tests failed");
      }

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

        // Need to manually add auth
        blueprint.addAuth(auth);

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
          ["github", "username", "identity"]
        ),
        getBlueprintProps(
          "Proof of Instagram Handle",
          "zkemail/proof-of-instagram-handle",
          "Use a password reset email to proof you own the email connected to a instagram handle.",
          ["email", "identity", "social"]
        ),
        getBlueprintProps(
          "Proof of ETH Price",
          "strobe/proof-of-price",
          "price alert emails for eth price",
          ["eth", "price", "oracle"]
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

      test("Text search on tags only", async () => {
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

      test("Text search creates empty result", async () => {
        const blueprints = await listBlueprints({ search: "asdfasdfasdfasdfasdfasdfasdfasdf" });

        expect(blueprints.length).toBe(0);
      });

      test("List by filtering multiple status", async () => {
        console.log("in list blueprints test===============================");
        const blueprints = await listBlueprints({ status: [Status.InProgress, Status.Done] });
        console.log("blueprints: ", blueprints);

        expect(blueprints.length).toBe(0);
      });
    });
  });

  describe("Compilation tests", () => {
    // TODO: Rethink compilation tests
    return;
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
      blueprint.props.id = "04561e11-8015-4a0c-9543-c9e5568e0254";
      blueprint.props.status = Status.Done;
      const urls = await blueprint.getZKeyDownloadLink();
      expect(Object.entries(urls).length).toBe(4);
    });
  });

  describe("Blueprint Stars", () => {
    test("add/remove stars and list", async () => {
      // TODO: create blueprint here, don't use existing
      const blueprintId = "fe99e333-7017-4814-9c38-ddaa386fc0f7";
      const blueprint = await getBlueprintById(blueprintId);

      expect(blueprint.stars).toBeUndefined();
      const stars = await blueprint.getStars();
      expect(stars).toBe(0);
      expect(blueprint.stars).toBe(0);

      expect(await blueprint.addStar()).toBe(1);
      expect(blueprint.stars).toBe(1);

      // Re-adding should do nothing
      expect(await blueprint.addStar()).toBe(1);
      expect(blueprint.stars).toBe(1);

      // Calling listBlueprints should automatically fetch the stars as well
      const blueprints = await listBlueprints({ limit: 1000 });

      const listedBlueprint = blueprints.find((bp) => bp.props.id === blueprintId)!;

      expect(listedBlueprint.stars).toBe(1);

      // Check if can get users starred repos
      const starredSlugs = await getStarredBlueprints();

      expect(starredSlugs[0]).toBe(blueprint.props.slug!);

      // Remove star
      expect(await blueprint.removeStar()).toBe(0);
      expect(blueprint.stars).toBe(0);

      // Re-Removing should do nothing
      expect(await blueprint.removeStar()).toBe(0);
      expect(blueprint.stars).toBe(0);
    });
  });
});
