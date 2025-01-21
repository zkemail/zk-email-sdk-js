import { test, describe, expect } from "bun:test";
import { parsePublicSignals } from "../src/relayerUtils";
import { DecomposedRegex } from "../src";

describe("parsePublicSignals", () => {
  test("should parse public signals", () => {
    const publicSignals = [
      "17065011482015124977282970298439631182550457267344513671014250909064553612521",
      "2334392307038315863",
      "0",
      "902461930945294469469049061864238462133168371753019686485682756284276",
      "0",
      "0",
    ];
    const decomposedRegexes: DecomposedRegex[] = [
      {
        name: "subject",
        parts: [
          { isPublic: true, regexDef: "Welcome " },
          { isPublic: true, regexDef: "to the Succinct ZK Residency!" },
        ],
        location: "header",
        maxLength: 50,
      },
    ];

    const publicOutputs = parsePublicSignals(publicSignals, decomposedRegexes);
    console.log("publicOutputs: ", publicOutputs);
    expect(publicOutputs).toEqual({ subject: ["Welcome ", "to the Succinct ZK Residency!"] });
  });
});
