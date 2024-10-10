import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import pg from "pg";
import {
  Blueprint,
  BlueprintProps,
  createBlueprint,
  getBlueprint,
  listBlueprints,
} from "..";

function getBlueprintProps(): BlueprintProps {
  return {
    title: "Twitter",
    slug: "zkemail/twitter",
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

describe("Blueprint Basic CRUD tests", () => {
  let db: pg.Client;
  const blueprintIds: string[] = [];

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    try {
      console.log("Cleaning up db");
      await db.query("DELETE FROM blueprints WHERE id = ANY($1::uuid[])", [
        blueprintIds,
      ]);
      console.log("Cleanup db successfull");
    } catch (err) {
      console.error("Failed to cleanup db: ", err);
    }
  });

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
      console.log("listedBlueprintIds : ", listedBlueprintIds);
      console.log("localBlueprintIds: ", localBlueprintIds);

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
});
