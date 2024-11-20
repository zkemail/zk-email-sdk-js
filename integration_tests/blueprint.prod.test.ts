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

  test("Should only list blueprints not Done of logged in user", async () => {
    const blueprints = await sdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ2NzUyMjIsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.MqrxsUWt-f3rzg8rd_agovrgaEorMGcTL_PyeX4A7To",
        onTokenExpired: async () => {},
      },
    }).listBlueprints({
      status: [Status.Draft, Status.Done],
    });

    expect(blueprints.some((bp) => bp.props.status === Status.Failed)).toBeFalse();
    expect(blueprints.some((bp) => bp.props.status === Status.Draft)).toBeTrue();
    expect(
      blueprints.some((bp) => bp.props.id === "839eefd4-944e-419a-993a-dc7954b5b49a")
    ).toBeFalse();
    expect(
      blueprints.some((bp) => bp.props.id === "1e65293c-667b-4350-b9c0-1769c320662c")
    ).toBeTrue();
  });

  test("Should only list blueprints Done of logged out user", async () => {
    const blueprints = await sdk({
      baseUrl: "http://localhost:8080",
    }).listBlueprints({
      status: [Status.Draft, Status.Done],
    });

    expect(blueprints.some((bp) => bp.props.status === Status.Draft)).toBeFalse();
  });
});
