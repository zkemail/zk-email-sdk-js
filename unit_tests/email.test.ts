import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import airbnbTestEmail from "./airbnb_eml";
import { parseEmail, testDecomposedRegex } from "../src/utils";

describe("Email utils test suite", async () => {
  // Wait for wasm to initialize
  await new Promise((r) => setTimeout(r, 100));

  // test("Can parse an email", async () => {
  //   const parsedEmail = await parseEmail(airbnbTestEmail);
  //   expect(parsedEmail).not.toBeNil();
  // });

  // TODO: add back once we can check for invalid emails
  // test("Should fail on invalid email", async () => {
  //   try {
  //     await parseEmail("some invalid email");
  //   } catch (err) {
  //     expect(err).not.toBeNil();
  //     return;
  //   }
  //   throw Error("Succeeded to parse an invalid email");
  // });
  test("Can test a decomposed regex on a raw email", async () => {
    const parts = {
      parts: [
        {
          is_public: true,
          regex_def: "Hello",
        },
      ],
    };

    const result = testDecomposedRegex(airbnbTestEmail, parts);
    console.log("result: ", result);
  });
});
import airbnbTestEmail from "./airbnb_eml";
import { parseEmail, testDecomposedRegex } from "../src/utils";

describe("Email utils test suite", async () => {
  // Wait for wasm to initialize
  await new Promise((r) => setTimeout(r, 100));

  // test("Can parse an email", async () => {
  //   const parsedEmail = await parseEmail(airbnbTestEmail);
  //   expect(parsedEmail).not.toBeNil();
  // });

  // TODO: add back once we can check for invalid emails
  // test("Should fail on invalid email", async () => {
  //   try {
  //     await parseEmail("some invalid email");
  //   } catch (err) {
  //     expect(err).not.toBeNil();
  //     return;
  //   }
  //   throw Error("Succeeded to parse an invalid email");
  // });
  test("Can test a decomposed regex on a raw email", async () => {
    const parts = {
      parts: [
        {
          is_public: true,
          regex_def: "Hello",
        },
      ],
    };

    const result = testDecomposedRegex(airbnbTestEmail, parts);
    console.log("result: ", result);
  });
});
