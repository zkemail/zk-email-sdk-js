import { expect, test, describe, beforeAll, afterAll, it } from "bun:test";
import { readFileSync } from "fs";
import { generateProofInputs } from "../src";

const amazonEml = readFileSync("unit_tests/amazon3.eml", "utf-8");

describe("Email utils test suite", async () => {
  // Wait for wasm to initialize
  // await new Promise((r) => setTimeout(r, 100));

  test("parseEmail test", async () => {
    const decomposedRegex = [
      {
        name: "emailRecipient",
        parts: [
          { regexDef: "(\r\n|^)to:" },
          { regexDef: "([^\r\n]+<)?" },
          {
            isPublic: true,
            regexDef: "[a-zA-Z0-9!#$%&\\*\\+-/=\\?\\^_`{\\|}~\\.]+@[a-zA-Z0-9_\\.-]+",
          },
          { regexDef: ">?\r\n" },
        ],
        location: "header",
        maxLength: 64,
      },
      {
        name: "senderDomain",
        parts: [
          { regexDef: "(\r\n|^)from:[^\r\n]*@" },
          { isPublic: true, regexDef: "[A-Za-z0-9][A-Za-z0-9\\.-]+\\.[A-Za-z]{2,}" },
          { regexDef: "[>\r\n]" },
        ],
        location: "header",
        maxLength: 64,
      },
      {
        name: "emailTimestamp",
        parts: [
          { regexDef: "(\r\n|^)dkim-signature:" },
          { regexDef: "([a-z]+=[^;]+; )+t=" },
          { isPublic: true, regexDef: "[0-9]+" },
          { regexDef: ";" },
        ],
        location: "header",
        maxLength: 64,
      },
      {
        name: "subject",
        parts: [
          { regexDef: "(\r\n|^)subject:" },
          { isPublic: true, regexDef: "[^\r\n]+" },
          { regexDef: "\r\n" },
        ],
        location: "header",
        maxLength: 128,
      },
    ];

    const externalInputs = {
      name: "address",
      value: "0x0000",
      maxLength: 44,
    };

    console.log("externalInput: ", externalInputs);

    const params = {
      emailHeaderMaxLength: 1024,
      emailBodyMaxLength: 0,
      ignoreBodyHashCheck: true,
      removeSoftLinebreaks: true,
      shaPrecomputeSelector: "",
    };

    // @ts-ignore
    for (let i = 0; i < 40; i++) {
      const inputs = await generateProofInputs(
        amazonEml,
        // @ts-ignore
        decomposedRegex,
        [externalInputs],
        params
      );
      const parsed = JSON.parse(inputs);
      console.log("inputs: ", parsed.pubkey[0]);
    }
  }, 180_000);
});
