import { test, describe, expect } from "bun:test";
import { parsePublicSignals } from "../src/relayerUtils";
import { DecomposedRegex } from "../src";

describe("parsePublicSignals", () => {
  test("should parse public signals", () => {
    // const publicSignals = [
    //   "17065011482015124977282970298439631182550457267344513671014250909064553612521",
    //   "2334392307038315863",
    //   "0",
    //   "902461930945294469469049061864238462133168371753019686485682756284276",
    //   "0",
    //   "0",
    // ];
    const publicSignals = [
      "17685262804787528775822246417221886439009534120750582566515666856415572899671",
      "298758402699298466954246771709755242608",
      "314737872957615243291719964091922206813",
      "693071745690839634437479800507799058148939490638",
      "0",
      "0",
      "8302335936975073348041746242676053506062890133937399000989172097133178947272",
      "0",
      "13563782407157808",
      "0",
    ];

    const decomposedRegexes: DecomposedRegex[] = [
      {
        name: "subject",
        parts: [
          { regexDef: "(\r\n|^)subject:", isPublic: false },
          { isPublic: true, regexDef: "[^\r\n]+" },
          { regexDef: "\r\n", isPublic: false },
        ],
        location: "header",
        maxLength: 64,
      },
      {
        name: "emailRecipient",
        parts: [
          { regexDef: "(\r\n|^)to:([^\r\n]+<)?", isPublic: false },
          {
            isPublic: true,
            regexDef: "[a-zA-Z0-9!#$%&\\*\\+-/=\\?\\^_`{\\|}~\\.]+@[a-zA-Z0-9_\\.-]+",
          },
          { regexDef: ">?\r\n", isPublic: false },
        ],
        location: "header",
        isHashed: true,
        maxLength: 64,
      },
    ];

    const publicOutputs = parsePublicSignals(publicSignals, decomposedRegexes);
    expect(publicOutputs).toEqual({
      subject: ["New login to Spotify"],
      emailRecipient: [
        "8302335936975073348041746242676053506062890133937399000989172097133178947272",
      ],
    });
  });
});
