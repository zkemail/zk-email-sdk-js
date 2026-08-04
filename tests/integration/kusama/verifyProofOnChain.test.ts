import { expect, test, describe } from "bun:test";
import { initZkEmailSdk } from "../../../src";
import { verifyProofOnChain } from "../../../src/chain";

// zkemailverify/kusama_grant_paseo_e2e (blueprint e94e7f93-7575-4e26-a147-de894b19ce3e),
// compiled and deployed to Paseo through the current pipeline. Lives in the staging
// database (created via the registry frontend against staging-conductor), not dev/prod.
const sdk = initZkEmailSdk({ baseUrl: "https://staging-conductor.zk.email" });
const PROOF_ID = "fece17c3-f3ed-4833-bbf9-eccdf530d474";

describe("On chain verification against Paseo (kusama_grant_paseo_e2e)", () => {
  test("verifies a real proof against the deployed Paseo verifier", async () => {
    const proof = await sdk.getProof(PROOF_ID);
    const result = await verifyProofOnChain(proof);
    expect(result).toBe(true);
  });

  test("rejects a tampered proof", async () => {
    const proof = await sdk.getProof(PROOF_ID);
    // @ts-ignore
    proof.props.proofData.pi_a[0] = "9999999999" + proof.props.proofData.pi_a[0].slice(10);

    // verifyProofOnChain catches the on-chain revert internally and resolves
    // to false, it does not throw (see its own try/catch in src/chain/index.ts).
    const result = await verifyProofOnChain(proof);
    expect(result).toBe(false);
  });
});
