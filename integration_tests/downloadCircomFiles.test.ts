import { test, describe, expect } from "bun:test";
import zkeSdk from "../src";
import { readFile } from "fs/promises";

const sdk = zkeSdk({
  baseUrl: "https://dev-conductor.zk.email",
  // baseUrl: "http://127.0.0.1:8080",
  logging: { enabled: true, level: 'debug' }
});

describe("test downloads", () => {
  test("circom downloads", async () => {
    const blueprint = await sdk.getBlueprintById("8241f8bd-9fe7-443d-a09d-0150dcc7e85e");
    const circuit = await blueprint.getCircomCircuit();
    console.log("circuit: ", circuit);
    const graphs = await blueprint.getCircomRegexGraphs();
    console.log("graphs: ", graphs);
  }, 30_000)
})
