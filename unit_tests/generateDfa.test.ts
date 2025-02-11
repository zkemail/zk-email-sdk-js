import { expect, test, describe, beforeAll, afterAll, it } from "bun:test";
import { DecomposedRegex, DecomposedRegexJson } from "../src/types";
import { generateDfa } from "../src/relayerUtils";

const timeout = 10_000;

describe("getnerateDfa test suite", async () => {
  test(
    "generateDfa should fail on invalid regex",
    async () => {
      const decomposedRegexHeader: DecomposedRegexJson = {
        name: "Sender",
        max_length: 30,
        location: "header",
        parts: [
          {
            is_public: true,
            regex_def: "(?=from:sir <)",
          },
        ],
      };

      try {
        await generateDfa(decomposedRegexHeader);
      } catch (err) {
        expect(err).toBeDefined();
        return;
      }
      throw new Error("Should have thrown an error");
    },
    timeout
  );

  test(
    "generateDfa should not fail on valid regex",
    async () => {
      const decomposedRegexHeader: DecomposedRegex = {
        name: "Sender",
        maxLength: 30,
        location: "header",
        parts: [
          // @ts-ignore
          {
            regexDef: "from:",
            isPublic: false,
          },
          {
            isPublic: true,
            regexDef: "[^,]+",
          },
          // @ts-ignore
          {
            regexDef: " <",
            isPublic: false,
          },
        ],
      };

      const dfa = await generateDfa(decomposedRegexHeader);
      expect(dfa).toBeString();
    },
    timeout
  );

  test("generateDfa uri", async () => {
    const decomposedRegexes: DecomposedRegexJson[] = [
      {
        name: "product_name_short",
        parts: [
          { regex_def: "Ya tenés tu ", is_public: false },
          { is_public: true, regex_def: "[A-Za-zÁÉÍÓÚáéíóúñÑ\\s]+" },
        ],
        location: "body",
        max_length: 64,
      },
      {
        name: "product_name_long",
        parts: [
          { regex_def: '!important">', is_public: false },
          { is_public: true, regex_def: "[A-Za-zÁÉÍÓÚáéíóúñÑ\\s]+(=\\n)?[A-Za-zÁÉÍÓÚáéíóúñÑ\\s]+" },
        ],
        location: "body",
        max_length: 64,
      },
      {
        name: "receive_address",
        parts: [
          { regex_def: "la entrega en", is_public: false },
          { is_public: true, regex_def: "[A-Za-zÁÉÍÓÚáéíóúñÑ\\s1-9,.]+" },
          { regex_def: "</p>", is_public: false },
        ],
        location: "body",
        max_length: 64,
      },
    ];

    for (const [index, dr] of decomposedRegexes.entries()) {
      try {
        await generateDfa(dr);
      } catch (err) {
        if (index === 1) {
          expect(err).toBeDefined();
        }
      }
    }
  });

  // test("should limit lines of code of complex dcrs", async () => {
  //   const decomposedRegexes: DecomposedRegexJson[] = [
  //     {
  //       name: "product_name_short",
  //       parts: [
  //         { regex_def: "Ya tenés tu ", is_public: false },
  //         { is_public: true, regex_def: "[A-Za-zÁÉÍÓÚáéíóúñÑ\\s]+" },
  //       ],
  //       location: "body",
  //       max_length: 64,
  //     },
  //     {
  //       name: "product_name_long",
  //       parts: [
  //         { regex_def: '!important">', is_public: false },
  //         { is_public: true, regex_def: "[A-Za-zÁÉÍÓÚáéíóúñÑ\\s]+" },
  //       ],
  //       location: "body",
  //       max_length: 64,
  //     },
  //     {
  //       name: "receive_address",
  //       parts: [
  //         { regex_def: "la entrega en", is_public: false },
  //         { is_public: true, regex_def: "[A-Za-zÁÉÍÓÚáéíóúñÑ\\s1-9,.]+" },
  //         { regex_def: "</p>", is_public: false },
  //       ],
  //       location: "body",
  //       max_length: 64,
  //     },
  //     {
  //       name: "Sender",
  //       max_length: 30,
  //       location: "header",
  //       parts: [
  //         // @ts-ignore
  //         {
  //           regex_def: "from:",
  //           is_public: false,
  //         },
  //         {
  //           is_public: true,
  //           regex_def: "[^,]+",
  //         },
  //         // @ts-ignore
  //         {
  //           regex_def: " <",
  //           is_public: false,
  //         },
  //       ],
  //     },
  //     {
  //       name: "subject",
  //       parts: [
  //         { is_public: true, regex_def: "Welcome " },
  //         { is_public: true, regex_def: "to the Succinct ZK Residency!" },
  //       ],
  //       location: "header",
  //       max_length: 50,
  //     },
  //   ];

  //   for (const [index, dr] of decomposedRegexes.entries()) {
  //     try {
  //       console.log("dr: ", dr.name);
  //       const dfa = await generateDfa(dr);
  //       const lineBreaks = (dfa.match(/\n/g) || []).length;
  //       console.log(`Number of line breaks in DFA ${index}: ${lineBreaks}`);
  //     } catch (err) {
  //       console.log(`Failed on ${index}: `, err);
  //     }
  //   }
  // });
});
