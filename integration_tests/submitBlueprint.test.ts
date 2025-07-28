import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import zkeSdk from "../src";

const sdk = zkeSdk({
  baseUrl: "https://dev-conductor.zk.email",
  auth: {
    getToken: async () =>
    "",
    onTokenExpired: async () => {},
  },
});

describe("Submit a blueprint", () => {
  test("Submit", async () => {
    console.log("getting blueprint by id");
    const blueprint = await sdk.getBlueprintById("8241f8bd-9fe7-443d-a09d-0150dcc7e85e");
    console.log("got blueprint");
    await blueprint.submit();
    console.log("submitted");
  });
});
