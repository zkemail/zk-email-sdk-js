import { expect, test, describe, beforeAll, afterAll, it } from "bun:test";
import helloTestEmail from "./hello_eml";
import { generateProofInputs, parseEmail, testBlueprint, testDecomposedRegex } from "../src/utils";
import {
  BlueprintProps,
  DecomposedRegex,
  DecomposedRegexJson,
  DecomposedRegexPart,
  GenerateProofInputsParams,
} from "../src";
import { readFile } from "fs/promises";

describe("Email utils test suite", async () => {
  // Wait for wasm to initialize
  // await new Promise((r) => setTimeout(r, 100));

  test("Can parse an email", async () => {
    const parsedEmail = await parseEmail(helloTestEmail);

    expect(parsedEmail).not.toBeNil();
    expect(parsedEmail.canonicalizedBody).not.toBeNil();
    expect(parsedEmail.canonicalizedHeader).not.toBeNil();
    expect(parsedEmail.cleanedBody).not.toBeNil();
    expect(parsedEmail.headers).not.toBeNil();
    expect(parsedEmail.publicKey).not.toBeNil();
    expect(parsedEmail.signature).not.toBeNil();
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

  // test("Can test a decomposed regex on a raw email, hides isPublic false", async () => {
  //   const decomposedRegex: DecomposedRegex = {
  //     name: "Hello Pattern",
  //     maxLength: 4000,
  //     location: "body",
  //     parts: [
  //       {
  //         isPublic: false,
  //         regexDef: "Hello ",
  //       },
  //       {
  //         isPublic: true,
  //         regexDef: "[^,]+",
  //       },
  //       {
  //         isPublic: false,
  //         regexDef: "!",
  //       },
  //     ],
  //   };

  //   const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, false);
  //   expect(Bun.deepEquals(result, ["ZK Email"])).toBeTrue();
  // });

  // test("Can test a decomposed regex with snake case fields", async () => {
  //   const decomposedRegex: DecomposedRegexJson = {
  //     name: "Hello Pattern",
  //     max_length: 4000,
  //     location: "body",
  //     parts: [
  //       {
  //         is_public: false,
  //         regex_def: "Hello ",
  //       },
  //       {
  //         is_public: true,
  //         regex_def: "[^,]+",
  //       },
  //       {
  //         is_public: false,
  //         regex_def: "!",
  //       },
  //     ],
  //   };

  //   const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, false);
  //   expect(Bun.deepEquals(result, ["ZK Email"])).toBeTrue();
  // });

  // test("Should fail if maxLength is exceeded", async () => {
  //   const decomposedRegex: DecomposedRegex = {
  //     name: "Hello Pattern",
  //     maxLength: 100,
  //     location: "body",
  //     parts: [
  //       {
  //         isPublic: true,
  //         regexDef: "Hello ",
  //       },
  //     ],
  //   };

  //   try {
  //     await testDecomposedRegex(helloTestEmail, decomposedRegex, false);
  //   } catch (err) {
  //     expect(err.message).toBe("Max length of 100 was exceeded");
  //     return;
  //   }
  //   throw new Error("Did not fail although maxLength was exceeded");
  // });

  // test("Can test a decomposed regex on a raw email, reveals on isPublic true", async () => {
  //   const decomposedRegex: DecomposedRegex = {
  //     name: "Hello Pattern",
  //     maxLength: 4000,
  //     location: "body",
  //     parts: [
  //       {
  //         isPublic: false,
  //         regexDef: "Hello ",
  //       },
  //       {
  //         isPublic: true,
  //         regexDef: "[^,]+",
  //       },
  //       {
  //         isPublic: false,
  //         regexDef: "!",
  //       },
  //     ],
  //   };

  //   const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, true);
  //   expect(Bun.deepEquals(result, ["Hello ", "ZK Email", "!"])).toBeTrue();
  // });

  // test("Should fail testDecomposedRegex finding body in header", async () => {
  //   const decomposedRegex: DecomposedRegex = {
  //     name: "Hello Pattern",
  //     maxLength: 4000,
  //     location: "header",
  //     parts: [
  //       {
  //         isPublic: false,
  //         regexDef: "Hello ",
  //       },
  //       {
  //         isPublic: true,
  //         regexDef: "[^,]+",
  //       },
  //       {
  //         isPublic: false,
  //         regexDef: "!",
  //       },
  //     ],
  //   };

  //   try {
  //     await testDecomposedRegex(helloTestEmail, decomposedRegex, true);
  //   } catch (err) {
  //     expect(err).not.toBeUndefined();
  //     return;
  //   }
  //   throw new Error("Found body regex in header");
  // });

  // test("Should find email in header in testDecomposedRegex", async () => {
  //   const decomposedRegex: DecomposedRegex = {
  //     name: "Find sender Pattern",
  //     maxLength: 500,
  //     location: "header",
  //     parts: [
  //       {
  //         isPublic: true,
  //         regexDef: "dimi.zktest@gmail.com",
  //       },
  //     ],
  //   };

  //   const result = await testDecomposedRegex(helloTestEmail, decomposedRegex, true);
  //   expect(Bun.deepEquals(result, ["dimi.zktest@gmail.com"])).toBeTrue();
  // });

  test("Can create proof inputs", async () => {
    const helloEml = await readFile("unit_tests/test.eml", "utf-8");

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
  });
});

describe("testBlueprint", () => {
  test("Should find header and body", async () => {
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
  });

  test("should fail if max length of part is exceeded", async () => {
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
  });

  test("Should fail if body max length is exceeded", async () => {
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
  });

  test("Should cut off header if max length is exceeded", async () => {
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
  });
});
