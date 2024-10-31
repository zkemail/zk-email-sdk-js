import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import helloTestEmail from "./hello_eml";
import { parseEmail, testDecomposedRegex } from "../src/utils";
import { DecomposedRegex, DecomposedRegexJson, DecomposedRegexPart } from "../src";

describe("Email utils test suite", async () => {
  // Wait for wasm to initialize
  // await new Promise((r) => setTimeout(r, 100));

  test("Can parse an email", async () => {
    const parsedEmail = await parseEmail(helloTestEmail);
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

    const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, false);
    expect(Bun.deepEquals(result, ["ZK Email"])).toBeTrue();
  });

  test("Can test a decomposed regex with snake case fields", async () => {
    const decomposedRegex: DecomposedRegexJson = {
      name: "Hello Pattern",
      max_length: 4000,
      location: "body",
      parts: [
        {
          is_public: false,
          regex_def: "Hello ",
        },
        {
          is_public: true,
          regex_def: "[^,]+",
        },
        {
          is_public: false,
          regex_def: "!",
        },
      ],
    };

    const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, false);
    expect(Bun.deepEquals(result, ["ZK Email"])).toBeTrue();
  });

  test("Should fail if maxLength is exceeded", async () => {
    const decomposedRegex: DecomposedRegex = {
      name: "Hello Pattern",
      maxLength: 100,
      location: "body",
      parts: [
        {
          isPublic: true,
          regexDef: "Hello ",
        },
      ],
    };

    try {
      await testDecomposedRegex(helloTestEmail, decomposedRegex, false);
    } catch (err) {
      expect(err.message).toBe("Max length of 100 was exceeded");
      return;
    }
    throw new Error("Did not fail although maxLength was exceeded");
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

    const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, true);
    expect(Bun.deepEquals(result, ["Hello ", "ZK Email", "!"])).toBeTrue();
  });

  test("Should fail testDecomposedRegex finding body in header", async () => {
    const decomposedRegex: DecomposedRegex = {
      name: "Hello Pattern",
      maxLength: 4000,
      location: "header",
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

    try {
      await testDecomposedRegex(helloTestEmail, decomposedRegex, true);
    } catch (err) {
      expect(err).not.toBeUndefined();
      return;
    }
    throw new Error("Found body regex in header");
  });

  test("Should find email in header in testDecomposedRegex", async () => {
    const decomposedRegex: DecomposedRegex = {
      name: "Find sender Pattern",
      maxLength: 500,
      location: "header",
      parts: [
        {
          isPublic: true,
          regexDef: "dimi.zktest@gmail.com",
        },
      ],
    };

    const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, true);
    expect(Bun.deepEquals(result, ["dimi.zktest@gmail.com"])).toBeTrue();
  });
});
