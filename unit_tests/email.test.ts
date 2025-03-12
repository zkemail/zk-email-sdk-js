import { expect, test, describe, beforeAll, afterAll, it } from "bun:test";
// import helloTestEmail from "./hello_eml";
import {
  extractEMLDetails,
  generateProofInputs,
  parseEmail,
  testBlueprint,
  testDecomposedRegex,
} from "../src/relayerUtils";
import {
  Blueprint,
  BlueprintProps,
  DecomposedRegex,
  DecomposedRegexJson,
  GenerateProofInputsParams,
} from "../src";
import { readFileSync } from "fs";

const timeout = 10_000;

// NOTE: Tests fail due to parseEmail testing public key due to

const helloTestEmail = readFileSync("unit_tests/hello_eml.eml", "utf-8");
const helloEml = readFileSync("unit_tests/test.eml", "utf-8");
const amazonUk = readFileSync("emls/amazon_uk.eml", "utf-8");
const apple = readFileSync("emls/apple.eml", "utf-8");

describe("Email utils test suite", async () => {
  // Wait for wasm to initialize
  // await new Promise((r) => setTimeout(r, 100));

  test(
    "Can parse an email",
    async () => {
      const parsedEmail = await parseEmail(helloTestEmail);

      expect(parsedEmail).not.toBeNil();
      expect(parsedEmail.canonicalizedBody).not.toBeNil();
      expect(parsedEmail.canonicalizedHeader).not.toBeNil();
      expect(parsedEmail.cleanedBody).not.toBeNil();
      expect(parsedEmail.headers).not.toBeNil();
      expect(parsedEmail.publicKey).not.toBeNil();
      expect(parsedEmail.signature).not.toBeNil();
    },
    timeout
  );

  test(
    "Should fail on invalid email",
    async () => {
      try {
        await parseEmail("some invalid email");
      } catch (err) {
        expect(err).not.toBeNil();
        return;
      }
      throw Error("Succeeded to parse an invalid email");
    },
    timeout
  );

  test(
    "Should say which part and what regex is failing",
    async () => {
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
            regexDef: "[^,+",
          },
          {
            isPublic: false,
            regexDef: "!",
          },
        ],
      };

      const parsedEmail = await parseEmail(helloTestEmail);

      try {
        await testDecomposedRegex(
          parsedEmail.cleanedBody,
          parsedEmail.canonicalizedHeader,
          decomposedRegex,
          false
        );
      } catch (err) {
        expect(err).toBe(
          "Failed to extract strings: Invalid regex in parts, index 1: '[^,+' - Parsing error at position 4: Invalid character class"
        );
        return;
      }

      throw new Error("Should have failed on invalid regex");
    },
    timeout
  );

  test(
    "Can test a decomposed regex on a raw email, hides isPublic false",
    async () => {
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

      const parsedEmail = await parseEmail(helloTestEmail);

      const result = await testDecomposedRegex(
        parsedEmail.cleanedBody,
        parsedEmail.canonicalizedHeader,
        decomposedRegex,
        false
      );

      expect(Bun.deepEquals(result, ["ZK Email"])).toBeTrue();
    },
    timeout
  );

  test(
    "Can test a decomposed regex on a raw email, hides isPublic false",
    async () => {
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

      const parsedEmail = await parseEmail(helloTestEmail);

      const result = await testDecomposedRegex(
        parsedEmail.cleanedBody,
        parsedEmail.canonicalizedHeader,
        decomposedRegex,
        false
      );

      expect(Bun.deepEquals(result, ["ZK Email"])).toBeTrue();
    },
    timeout
  );

  test(
    "Can test a decomposed regex with snake case fields",
    async () => {
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

      const parsedEmail = await parseEmail(helloTestEmail);
      const result = await testDecomposedRegex(
        parsedEmail.cleanedBody,
        parsedEmail.canonicalizedHeader,
        decomposedRegex,
        false
      );
      expect(Bun.deepEquals(result, ["ZK Email"])).toBeTrue();
    },
    timeout
  );

  test(
    "Should fail if maxLength is exceeded",
    async () => {
      const decomposedRegex: DecomposedRegex = {
        name: "Hello Pattern",
        maxLength: 3,
        location: "body",
        parts: [
          {
            isPublic: true,
            regexDef: "Hello ",
          },
        ],
      };
      const parsedEmail = await parseEmail(helloTestEmail);

      try {
        await testDecomposedRegex(
          parsedEmail.cleanedBody,
          parsedEmail.canonicalizedHeader,
          decomposedRegex,
          false
        );
      } catch (err) {
        expect(err.message).toBe(
          "Max length of 3 of extracted result was exceeded for decomposed regex Hello Pattern"
        );
        return;
      }
      throw new Error("Did not fail although maxLength was exceeded");
    },
    timeout
  );

  test(
    "Can test a decomposed regex on a raw email, reveals on isPublic true",
    async () => {
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

      const parsedEmail = await parseEmail(helloTestEmail);
      const result = await testDecomposedRegex(
        parsedEmail.cleanedBody,
        parsedEmail.canonicalizedHeader,
        decomposedRegex,
        true
      );
      expect(Bun.deepEquals(result, ["Hello ", "ZK Email", "!"])).toBeTrue();
    },
    timeout
  );

  test(
    "Should fail testDecomposedRegex finding body in header",
    async () => {
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

      const parsedEmail = await parseEmail(helloTestEmail);
      try {
        await testDecomposedRegex(
          parsedEmail.cleanedBody,
          parsedEmail.canonicalizedHeader,
          decomposedRegex,
          true
        );
      } catch (err) {
        expect(err).not.toBeUndefined();
        return;
      }
      throw new Error("Found body regex in header");
    },
    timeout
  );

  test(
    "Should find email in header in testDecomposedRegex",
    async () => {
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

      const parsedEmail = await parseEmail(helloTestEmail);
      const result = await testDecomposedRegex(
        parsedEmail.cleanedBody,
        parsedEmail.canonicalizedHeader,
        decomposedRegex,
        true
      );
      expect(Bun.deepEquals(result, ["dimi.zktest@gmail.com"])).toBeTrue();
    },
    timeout
  );

  test(
    "Can create proof inputs",
    async () => {
      const decomposedRegexes: DecomposedRegex[] = [
        {
          parts: [
            {
              isPublic: true,
              regexDef: "Hi",
            },
            {
              isPublic: true,
              regexDef: "!",
            },
          ],
          name: "hi",
          maxLength: 64,
          location: "body",
        },
      ];

      const params: GenerateProofInputsParams = {
        emailHeaderMaxLength: 2816,
        emailBodyMaxLength: 1024,
        ignoreBodyHashCheck: false,
        removeSoftLinebreaks: true,
      };

      const inputs = await generateProofInputs(helloEml, decomposedRegexes, [], params);
      expect(inputs).toBeDefined();
    },
    timeout
  );
});

describe("testBlueprint", async () => {
  test(
    "Should find header and body",
    async () => {
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

      const decomposedRegexHeader: DecomposedRegex = {
        name: "Sender",
        maxLength: 10,
        location: "header",
        parts: [
          {
            isPublic: false,
            regexDef: "from:",
          },
          {
            isPublic: true,
            regexDef: "[^,]+",
          },
          {
            isPublic: false,
            regexDef: " <",
          },
        ],
      };

      // @ts-ignore
      const blueprintProps: BlueprintProps = {
        emailBodyMaxLength: 1024,
        emailHeaderMaxLength: 1024,
        decomposedRegexes: [decomposedRegex, decomposedRegexHeader],
      };

      const results = await testBlueprint(helloTestEmail, blueprintProps, false);
      expect(Bun.deepEquals(results[0], ["ZK Email"])).toBeTrue();
      expect(Bun.deepEquals(results[1], ["Dimitri"])).toBeTrue();
    },
    timeout
  );

  test(
    "should fail if max length of part is exceeded",
    async () => {
      const decomposedRegex: DecomposedRegex = {
        name: "Hello Pattern",
        maxLength: 1,
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

      // @ts-ignore
      const blueprintProps: BlueprintProps = {
        emailBodyMaxLength: 1024,
        emailHeaderMaxLength: 1024,
        decomposedRegexes: [decomposedRegex],
      };

      try {
        await testBlueprint(helloTestEmail, blueprintProps, false);
      } catch (err) {
        expect(err).toBeDefined();
        return;
      }
      throw new Error("Did not throw an error on max length exceeded");
    },
    timeout
  );

  test(
    "Should fail if body max length is exceeded",
    async () => {
      const decomposedRegex: DecomposedRegex = {
        name: "Hello Pattern",
        maxLength: 10,
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

      // @ts-ignore
      const blueprintProps: BlueprintProps = {
        emailBodyMaxLength: 64,
        emailHeaderMaxLength: 1024,
        decomposedRegexes: [decomposedRegex],
      };

      try {
        await testBlueprint(helloTestEmail, blueprintProps, false);
      } catch (err) {
        expect(err).toBeDefined();
        return;
      }
      throw new Error("Matched a pattern in a cut off body");
    },
    timeout
  );

  test(
    "Should cut off header if max length is exceeded",
    async () => {
      const decomposedRegexHeader: DecomposedRegex = {
        name: "Sender",
        maxLength: 30,
        location: "header",
        parts: [
          {
            isPublic: false,
            regexDef: "from:",
          },
          {
            isPublic: true,
            regexDef: "[^,]+",
          },
          {
            isPublic: false,
            regexDef: " <",
          },
        ],
      };

      // @ts-ignore
      const blueprintProps: BlueprintProps = {
        emailBodyMaxLength: 1024,
        emailHeaderMaxLength: 10,
        decomposedRegexes: [decomposedRegexHeader],
      };

      try {
        await testBlueprint(helloTestEmail, blueprintProps, false);
      } catch (err) {
        expect(err).toBeDefined();
        return;
      }
      throw new Error("Did not failed to find header in cut off header");
    },
    timeout
  );

  test(
    "Should fail on lookahead",
    async () => {
      const decomposedRegexHeader: DecomposedRegex = {
        name: "Hello",
        maxLength: 1000,
        location: "body",
        parts: [
          {
            isPublic: false,
            regexDef: "Hello ",
          },
          {
            isPublic: true,
            regexDef: "[^,]+",
            regexDef: "[sS]*?(?=Emai!)",
          },
          {
            isPublic: false,
            regexDef: "!",
          },
        ],
      };

      // @ts-ignore
      const blueprintProps: BlueprintProps = {
        emailBodyMaxLength: 1024,
        emailHeaderMaxLength: 1024,
        decomposedRegexes: [decomposedRegex],
      };

      const blueprint = new Blueprint(blueprintProps, "");

      const isValid = await blueprint.validateEmail(helloTestEmail);
      expect(isValid).toBeFalse();
    },
    timeout
  );
});

describe("extractEMLDetails", () => {
  test("should extract normal sender domain", async () => {
    const { senderDomain } = await extractEMLDetails(apple);
    console.log("senderDomain: ", senderDomain);
  });
});
