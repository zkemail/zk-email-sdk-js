/**
 * Public outputs are verified and decoded from ONE canonical copy, a proof's publicData must be
 * what its verified outputs decode to, and DKIM-Signature d=/s= are read from every signature.
 * Synthetic data only; the proof system and the key archive are stubbed (no network).
 */
import { describe, expect, mock, test, afterEach } from "bun:test";
import { generateKeyPairSync } from "node:crypto";

// REASON: stub the proof system so the test checks what verifyProof does AROUND it.
mock.module("@zk-email/snarkjs", () => ({ groth16: { verify: async () => true } }));

const { Blueprint, ZkFramework } = await import("../../src/blueprint");
const { Proof } = await import("../../src/proof");
const { verifyProof } = await import("../../src/verify");
const { parseNoirPublicOutputs } = await import("../../src/prover/noir");
const { canonicalPublicOutputs, BN254_FIELD_MODULUS } =
  await import("../../src/utils/publicOutputs");
const { poseidonLarge } = await import("../../src/utils/hash");
const { getDKIMSelector } = await import("../../src/utils");
const { dkimSignaturesFromEml } = await import("../../src/utils/dkimSignature");

const hex = (v: number | bigint) => "0x" + BigInt(v).toString(16).padStart(64, "0");

/** Noir outputs: 5 fixed fields, then one public part as BoundedVec<u8, max> + length. */
function noirOutputs(text: string, max = 8): string[] {
  const bytes = new TextEncoder().encode(text);
  const slots = Array.from({ length: max }, (_, i) => hex(bytes[i] ?? 0));
  return [hex(1), hex(2), hex(3), hex(4), hex(0), ...slots, hex(bytes.length)];
}

const noirRegex = [
  {
    name: "subject",
    location: "header" as const,
    maxMatchLength: 8,
    parts: [
      { isPublic: false, regexDef: "subject:" },
      { isPublic: true, regexDef: "[^\\r\\n]+", maxLength: 8 },
    ],
  },
];

describe("canonical public outputs", () => {
  test("hex and decimal spellings are normalized; anything else is rejected", () => {
    expect(canonicalPublicOutputs(["0x41", "65"], "hex")).toEqual([hex(0x41), hex(0x41)]);
    expect(canonicalPublicOutputs(["0x41", "65"], "decimal")).toEqual(["65", "65"]);
    for (const bad of [" 65", "0x41 ", "-1", "1e3", "0b1", 65, null]) {
      expect(() => canonicalPublicOutputs([bad], "hex")).toThrow();
    }
    expect(() => canonicalPublicOutputs(["0x" + BN254_FIELD_MODULUS.toString(16)], "hex")).toThrow(
      /modulus/
    );
  });
});

describe("parseNoirPublicOutputs", () => {
  test("decodes by the committed length, including bytes < 0x10 and multi-byte UTF-8", () => {
    const { publicData } = parseNoirPublicOutputs(noirOutputs("a\tb\né"), noirRegex as any);
    expect(publicData.subject).toEqual(["a\tb\né"]);
  });

  test("ignores slots past the committed length", () => {
    const outputs = noirOutputs("ok");
    outputs[5 + 2] = hex(0x58); // a non-zero byte after the 2-byte match
    const { publicData } = parseNoirPublicOutputs(outputs, noirRegex as any);
    expect(publicData.subject).toEqual(["ok"]);
  });

  test("a byte slot above 0xff is rejected", () => {
    const outputs = noirOutputs("ok");
    outputs[5] = hex(0x141);
    expect(() => parseNoirPublicOutputs(outputs, noirRegex as any)).toThrow(
      /byte output out of range/
    );
  });
});

describe("verifyProof binds publicData to the verified outputs (Circom)", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  async function circomProof(publicData: Record<string, string[]>, publicOutputs?: string[]) {
    // Throwaway key "published" for the blueprint's domain via a stubbed archive.
    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const p = publicKey.export({ format: "der", type: "spki" }).toString("base64");
    const n = BigInt(
      "0x" + Buffer.from(publicKey.export({ format: "jwk" }).n!, "base64url").toString("hex")
    );
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          { domain: "example.test", selector: "s", value: `v=DKIM1; k=rsa; p=${p}` },
        ]),
        {
          status: 200,
        }
      )) as any;
    const keyHash = (await poseidonLarge(n, 9, 242)).toString();

    // "Hi" packed little-endian into one 31-byte field, as the Circom blueprint circuit outputs it.
    const packed = (BigInt("i".charCodeAt(0)) << 8n) | BigInt("H".charCodeAt(0));
    const blueprint = new Blueprint(
      {
        id: "bp",
        senderDomain: "example.test",
        decomposedRegexes: [
          {
            name: "subject",
            location: "header",
            maxLength: 31,
            parts: [{ isPublic: true, regexDef: "Hi" }],
          },
        ],
      } as any,
      "http://localhost.invalid"
    );
    blueprint.getVkey = async () => "{}";
    return new Proof(blueprint, {
      id: "proof",
      blueprintId: "bp",
      zkFramework: ZkFramework.Circom,
      proofData: {} as any,
      publicOutputs: publicOutputs ?? [keyHash, "1", "2", packed.toString()],
      publicData,
      isLocal: false,
    } as any);
  }

  test("untouched publicData verifies", async () => {
    expect(await verifyProof(await circomProof({ subject: ["Hi"] }))).toBe(true);
  });

  test("REGRESSION: edited publicData is rejected although the proof itself is valid", async () => {
    expect(await verifyProof(await circomProof({ subject: ["Bye"] }))).toBe(false);
  });

  test("non-canonical public outputs are rejected", async () => {
    const proof = await circomProof({ subject: ["Hi"] });
    const outputs = [...(proof.props.publicOutputs as string[])];
    outputs[3] = ` ${outputs[3]}`;
    proof.props.publicOutputs = outputs;
    expect(await verifyProof(proof)).toBe(false);
  });
});

describe("DKIM-Signature d=/s=", () => {
  const eml =
    "X-Google-DKIM-Signature: v=1; a=rsa-sha256; d=1e100.net; s=20230601; b=x\r\n" +
    "DKIM-Signature: v=1; a=rsa-sha256; c=simple/simple;\r\n" +
    "\td=esp.test;\r\n s=mail; h=from; bh=YWJjZA==; b=y\r\n" +
    "dkim-signature: v=1; d=example.test; s=sel; b=z\r\n" +
    "From: a@example.test\r\n\r\nbody";

  test("folded and multiple signatures; X-Google-DKIM-Signature is not a DKIM-Signature", () => {
    expect(dkimSignaturesFromEml(eml)).toEqual([
      { domain: "esp.test", selector: "mail" },
      { domain: "example.test", selector: "sel" },
    ]);
    expect(getDKIMSelector(eml)).toBe("mail");
  });
});
