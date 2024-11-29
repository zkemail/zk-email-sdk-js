/*
  These tests are intended to be tested with a local databse that is set up already.
  Some tests also test the prod database directly.
*/
import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import zkeSdk, { Status } from "../src";

describe("Blueprint prod test suite", () => {
  test("Should list by status", async () => {
    const blueprints = await zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ2NzUyMjIsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.MqrxsUWt-f3rzg8rd_agovrgaEorMGcTL_PyeX4A7To",
        onTokenExpired: async () => {},
      },
    }).listBlueprints({
      status: [Status.InProgress, Status.Done],
    });

    expect(blueprints.some((bp) => bp.props.status === Status.Failed)).toBe(false);
    expect(blueprints.some((bp) => bp.props.status === Status.Draft)).toBe(false);
    expect(blueprints.some((bp) => bp.props.status === Status.InProgress)).toBe(true);
    expect(blueprints.some((bp) => bp.props.status === Status.Done)).toBe(true);
  });

  test("Should be able to search partial words", async () => {
    const blueprints = await zkeSdk({ baseUrl: "http://localhost:8080" }).listBlueprints({
      search: "wit",
    });

    expect(blueprints.length).toBeGreaterThan(0);
  });

  test("Should sort by default", async () => {
    const blueprints = await zkeSdk({ baseUrl: "http://localhost:8080" }).listBlueprints();
    expect(blueprints[0].props.updatedAt!.getTime()).toBeGreaterThanOrEqual(
      blueprints[1].props.updatedAt!.getTime()
    );
  });

  test("Should find blueprint by slug", async () => {
    const blueprint = await zkeSdk().getBlueprint("Bisht13/SuccinctZKResidencyInvite@v1");
    expect(blueprint.props.version).toBe(1);
  });

  test("Should only list blueprints not Done of logged in user", async () => {
    const blueprints = await zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally - non admin
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ3NjE0ODIsImdpdGh1Yl91c2VybmFtZSI6InprZW1haWwifQ.a02SblRzgAfBVxCv-OQdK7MYDMokg9PN6x3xduRK22o",
        onTokenExpired: async () => {},
      },
    }).listBlueprints({
      status: [Status.Draft, Status.Done],
    });

    expect(blueprints.some((bp) => bp.props.status === Status.Failed)).toBeFalse();
    expect(blueprints.some((bp) => bp.props.status === Status.Draft)).toBeTrue();
    expect(
      blueprints.some(
        (bp) => bp.props.status === Status.Draft && bp.props.githubUsername !== "zkemail"
      )
    ).toBeFalse();
  });

  test("Should only list blueprints Done of logged out user", async () => {
    const blueprints = await zkeSdk({
      baseUrl: "http://localhost:8080",
    }).listBlueprints({
      status: [Status.Draft, Status.Done],
    });

    expect(blueprints.some((bp) => bp.props.status === Status.Draft)).toBeFalse();
  });

  test("Should only list blueprints Done of logged out user", async () => {
    const blueprints = await zkeSdk({
      baseUrl: "http://localhost:8080",
    }).listBlueprints({
      status: [Status.Draft, Status.Done],
    });

    expect(blueprints.some((bp) => bp.props.status === Status.Draft)).toBeFalse();
  });

  test("Should list all draft blueprints for admin user", async () => {
    const blueprints = await zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ2NzUyMjIsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.MqrxsUWt-f3rzg8rd_agovrgaEorMGcTL_PyeX4A7To",
        onTokenExpired: async () => {},
      },
    }).listBlueprints({
      status: [Status.Draft],
    });

    expect(blueprints.some((bp) => bp.props.githubUsername !== "DimiDumo")).toBeTrue();
    expect(blueprints.some((bp) => bp.props.status !== Status.Draft)).toBeFalse();
  });

  test("Owner should be able to update blueprint", async () => {
    const sdk = zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally - non admin zkemail
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ3NjE0ODIsImdpdGh1Yl91c2VybmFtZSI6InprZW1haWwifQ.a02SblRzgAfBVxCv-OQdK7MYDMokg9PN6x3xduRK22o",
        onTokenExpired: async () => {},
      },
    });

    const blueprint = await sdk.getBlueprintById("166f7893-c827-48a6-bcb0-316c80d534dc");
    const props = blueprint.getClonedProps();
    const description = "Proof fancy stuff " + Math.random();
    props.description = description;
    await blueprint.update(props);

    expect(blueprint.props.description).toBe(description);
    // Github Username should stay the same
    expect(blueprint.props.githubUsername).toBe("zkemail");
  });

  test("Non logged in user should not be able to update blueprint", async () => {
    const sdk = zkeSdk({
      baseUrl: "http://localhost:8080",
    });

    const blueprint = await sdk.getBlueprintById("166f7893-c827-48a6-bcb0-316c80d534dc");
    const props = blueprint.getClonedProps();
    const description = "Proof fancy stuff " + Math.random();
    props.description = description;
    try {
      await blueprint.update(props);
    } catch (err) {
      console.log("err: ", err);
      expect(err).toBeDefined();
      return;
    }

    throw Error("Non owner was able to update blueprint");
  });

  test("Logged in user, not owner, should not be able to update blueprint", async () => {
    const sdk = zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally - non admin zkemail
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ3NjE0ODIsImdpdGh1Yl91c2VybmFtZSI6InprZW1haWwifQ.a02SblRzgAfBVxCv-OQdK7MYDMokg9PN6x3xduRK22o",
        onTokenExpired: async () => {},
      },
    });

    const blueprint = await sdk.getBlueprintById("1c2ca83c-426d-4fac-97a3-097b0b33a78b");
    const props = blueprint.getClonedProps();
    const description = "Proof fancy stuff " + Math.random();
    props.description = description;
    try {
      await blueprint.update(props);
    } catch (err) {
      expect(err).toBeDefined();
      return;
    }

    throw Error("Non owner was able to update blueprint");
  });

  test("Logged in admin, not owner, should be able to update blueprint, not change username", async () => {
    const sdk = zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ2NzUyMjIsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.MqrxsUWt-f3rzg8rd_agovrgaEorMGcTL_PyeX4A7To",
        onTokenExpired: async () => {},
      },
    });

    const blueprint = await sdk.getBlueprintById("166f7893-c827-48a6-bcb0-316c80d534dc");
    const props = blueprint.getClonedProps();
    const oldGithubUsername = props.githubUsername!;
    const description = "Proof fancy stuff " + Math.random();
    props.description = description;
    await blueprint.update(props);
    expect(blueprint.props.description).toBe(description);
    // Github Username should stay the same
    expect(blueprint.props.githubUsername).toBe(oldGithubUsername);
  });

  test("Logged in user should be able to create a new blueprint version", async () => {
    const sdk = zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally - non admin zkemail
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ3NjE0ODIsImdpdGh1Yl91c2VybmFtZSI6InprZW1haWwifQ.a02SblRzgAfBVxCv-OQdK7MYDMokg9PN6x3xduRK22o",
        onTokenExpired: async () => {},
      },
    });

    const blueprint = await sdk.getBlueprintById("166f7893-c827-48a6-bcb0-316c80d534dc");
    const props = blueprint.getClonedProps();
    const oldVersion = props.version!;
    const oldGithubUsername = props.githubUsername!;
    const description = "Proof fancy stuff " + Math.random();
    props.description = description;
    await blueprint.submitNewVersionDraft(props);
    expect(blueprint.props.description).toBe(description);
    // Github Username should stay the same
    expect(blueprint.props.githubUsername).toBe(oldGithubUsername);
    expect(blueprint.props.version).toBeGreaterThan(oldVersion);
  });

  test("Not logged in user should not be able to create a new blueprint version", async () => {
    const sdk = zkeSdk({
      baseUrl: "http://localhost:8080",
    });

    const blueprint = await sdk.getBlueprintById("166f7893-c827-48a6-bcb0-316c80d534dc");
    const props = blueprint.getClonedProps();
    const description = "Proof fancy stuff " + Math.random();
    props.description = description;
    try {
      await blueprint.submitNewVersionDraft(props);
    } catch (err) {
      expect(err).toBeDefined();
      return;
    }

    throw new Error("Non logged in user was able to create new blueprint version");
  });

  test("Admin should be able to create a new blueprint version", async () => {
    const sdk = zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ2NzUyMjIsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.MqrxsUWt-f3rzg8rd_agovrgaEorMGcTL_PyeX4A7To",
        onTokenExpired: async () => {},
      },
    });

    const blueprint = await sdk.getBlueprintById("166f7893-c827-48a6-bcb0-316c80d534dc");
    const props = blueprint.getClonedProps();
    const oldVersion = props.version!;
    const oldGithubUsername = props.githubUsername!;
    const description = "Proof fancy stuff " + Math.random();
    props.description = description;
    await blueprint.submitNewVersionDraft(props);
    expect(blueprint.props.description).toBe(description);
    // Github Username should stay the same
    expect(blueprint.props.githubUsername).toBe(oldGithubUsername);
    expect(blueprint.props.version).toBeGreaterThan(oldVersion);
  });

  test("Should only list newest version", async () => {
    const blueprints = await zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ2NzUyMjIsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.MqrxsUWt-f3rzg8rd_agovrgaEorMGcTL_PyeX4A7To",
        onTokenExpired: async () => {},
      },
    }).listBlueprints();

    const versionCount = blueprints.reduce((acc, cur) => {
      if (!acc[cur.props.slug!]) {
        acc[cur.props.slug!] = 1;
      } else {
        acc[cur.props.slug!] += 1;
      }
      return acc;
    }, {});

    expect(Object.values(versionCount).some((vc) => vc > 1)).toBeFalse();
  });

  test("Should show all statuses if not filtered for", async () => {
    const blueprints = await zkeSdk({
      baseUrl: "http://localhost:8080",
      auth: {
        getToken: async () =>
          // Token only usable locally - non admin zkemail
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzQ3NjE0ODIsImdpdGh1Yl91c2VybmFtZSI6InprZW1haWwifQ.a02SblRzgAfBVxCv-OQdK7MYDMokg9PN6x3xduRK22o",
        onTokenExpired: async () => {},
      },
    }).listBlueprints();

    console.log(
      "blueprints: ",
      blueprints.map((bp) => ({ status: bp.props.status }))
    );

    expect(blueprints.some((bp) => bp.props.status === Status.Done)).toBeTrue();
    expect(blueprints.some((bp) => bp.props.status === Status.Draft)).toBeTrue();
  });
});