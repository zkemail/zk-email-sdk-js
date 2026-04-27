import { test, describe, expect, beforeEach, afterEach, mock } from "bun:test";
import { verifyPubKey } from "../src/utils";
import { ZkFramework } from "../src/types";

// Minimal fetch mock returning an empty DKIM record list so getPKeys resolves
// to an empty array. The REG-670 guard runs before the pKeys loop, so empty
// pKeys is sufficient to exercise the throw.
const emptyArchiveResponse = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  } as Response);

describe("verifyPubKey - Noir (REG-670)", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = mock(emptyArchiveResponse) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("throws when hashedRedcKey is undefined", async () => {
    await expect(
      verifyPubKey("example.com", "0x123", ZkFramework.Noir)
    ).rejects.toThrow(/hashedRedcKey is required/);
  });

  test("throws when hashedRedcKey is an empty string", async () => {
    await expect(
      verifyPubKey("example.com", "0x123", ZkFramework.Noir, "")
    ).rejects.toThrow(/hashedRedcKey is required/);
  });

  test("references REG-670 in the error message", async () => {
    await expect(
      verifyPubKey("example.com", "0x123", ZkFramework.Noir)
    ).rejects.toThrow(/REG-670/);
  });
});

describe("verifyPubKey - non-Noir frameworks do not require hashedRedcKey", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mock(emptyArchiveResponse) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("Circom returns false (no match) without hashedRedcKey", async () => {
    const result = await verifyPubKey("example.com", "0xdeadbeef", ZkFramework.Circom);
    expect(result).toBe(false);
  });

  test("Sp1 returns false (no match) without hashedRedcKey", async () => {
    const result = await verifyPubKey("example.com", "0xdeadbeef", ZkFramework.Sp1);
    expect(result).toBe(false);
  });
});
