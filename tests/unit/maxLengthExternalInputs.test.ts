import { describe, expect, test } from "bun:test";
import { formatExternalInputRequirements } from "../../src/utils/maxLenghExternalInputs";

describe("formatExternalInputRequirements", () => {
  test("lists required input names in declaration order", () => {
    expect(
      formatExternalInputRequirements([
        { name: "email", maxLength: 50 },
        { name: "account", maxLength: 42 },
      ])
    ).toBe("email, account");
  });
});
