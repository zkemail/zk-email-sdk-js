import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import sdk, { Status } from "../src";

describe("Blueprint prod test suite", () => {
  test("Should list by status", async () => {
    const blueprints = await sdk({ baseUrl: "http://localhost:8080" }).listBlueprints({
      status: [Status.InProgress, Status.Done],
    });

    expect(blueprints.some((bp) => bp.props.status === Status.Failed)).toBe(false);
    expect(blueprints.some((bp) => bp.props.status === Status.Draft)).toBe(false);
    expect(blueprints.some((bp) => bp.props.status === Status.InProgress)).toBe(true);
    expect(blueprints.some((bp) => bp.props.status === Status.Done)).toBe(true);
  });

  test("Should be able to search partial words", async () => {
    const blueprints = await sdk({ baseUrl: "http://localhost:8080" }).listBlueprints({
      search: "wit",
    });

    expect(blueprints.length).toBeGreaterThan(0);
  });

  test("Should sort by default", async () => {
    const blueprints = await sdk({ baseUrl: "http://localhost:8080" }).listBlueprints();

    expect(blueprints[0].props.updatedAt!.getTime()).toBeGreaterThan(
      blueprints[1].props.updatedAt!.getTime()
    );
  });

  test("Should find blueprint by slug", async () => {
    const blueprint = await sdk().getBlueprint("Bisht13/SuccinctZKResidencyInvite:v1");
    expect(blueprint.props.version).toBe(2);
  });
});
