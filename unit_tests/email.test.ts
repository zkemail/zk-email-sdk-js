import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import airbnbTestEmail from "./hello_eml";
import { parseEmail, testDecomposedRegex } from "../src/utils";
import { DecomposedRegex, DecomposedRegexPart } from "../src";

describe("Email utils test suite", async () => {
  // Wait for wasm to initialize
  await new Promise((r) => setTimeout(r, 100));

  test("Can parse an email", async () => {
    const parsedEmail = await parseEmail(airbnbTestEmail);
    expect(parsedEmail).not.toBeNil();
  });

  test("Should fail on invalid email", async () => {
    try {
      await parseEmail("some invalid email");
    } catch (err) {
      expect(err).not.toBeNil();
      return;
    }
    throw Error("Succeeded to parse an invalid email");
  });

  test("Can test a decomposed regex on a raw email, hides isPublic false", async () => {
    const decomposedRegex: DecomposedRegex = {
      name: "Hello Pattern",
      maxLength: 4000,
      location: "body",
      parts: [
        {
          isPublic: false,
          regexDef: "Hello ",
        },
        {
          isPublic: true,
          regexDef: "[^,]+",
        },
        {
          isPublic: false,
          regexDef: "!",
        },
      ],
    };

    const result = testDecomposedRegex(airbnbTestEmail, decomposedRegex, false);
    expect(Bun.deepEquals(result, ["ZK Email"])).toBeTrue();
  });

  test("Can test a decomposed regex on a raw email, reveals on isPublic true", async () => {
    const decomposedRegex: DecomposedRegex = {
      name: "Hello Pattern",
      maxLength: 4000,
      location: "body",
      parts: [
        {
          isPublic: false,
          regexDef: "Hello ",
        },
        {
          isPublic: true,
          regexDef: "[^,]+",
        },
        {
          isPublic: false,
          regexDef: "!",
        },
      ],
    };

    const result = testDecomposedRegex(airbnbTestEmail, decomposedRegex, true);
    expect(Bun.deepEquals(result, ["Hello ", "ZK Email", "!"])).toBeTrue();
  });
});
