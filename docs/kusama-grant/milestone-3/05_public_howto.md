# 05 - Public How-To: On-Chain Verification on Paseo

Step-by-step walkthrough of the deliverable 4 golden path: fetch a blueprint, generate a proof, verify it on-chain, and check the deployed verifier contract - using only the public SDK API.

## Prerequisites

Create a new directory for the project and initialize npm:

```bash
mkdir zk-email-onchain-verification-demo
cd zk-email-onchain-verification-demo
npm init -y
npm pkg set type=module
npm install @zk-email/sdk@3.0.0-nightly.36
npm install -D tsx
```

The code snippets below use top-level `await`, so run them with `npx tsx <file>.ts` (that's what `tsx` above is for).

An email (`.eml`) file matching the blueprint's sender domain. This walkthrough uses a real DKIM-signed password-reset email from `x.com`, committed here so the example is reproducible: [`password-reset-request.eml`](../../../tests/integration/kusama/assets/password-reset-request.eml). Copy it into your project directory:

```bash
cp <your-path>/password-reset-request.eml .
```

If you don't need the step-by-step explanation, skip ahead to the [Full example](#full-example).

## 1) Initialize the SDK

```ts
import { initZkEmailSdk } from "@zk-email/sdk";

const sdk = initZkEmailSdk({ baseUrl: "https://conductor.zk.email" });
```

## 2) Fetch the blueprint

```ts
const blueprint = await sdk.getBlueprintById("e94e7f93-7575-4e26-a147-de894b19ce3e");
console.log("Blueprint:", blueprint.props.slug);
console.log("Verifier contract:", blueprint.props.verifierContract);
```

`verifierContract.chain` (`420420417`) is Paseo Testnet (Polkadot); `verifierContract.address` is the deployed `IZKEmailVerifier` contract for this blueprint. See [`04_sdk_on_chain_verification.md`](./04_sdk_on_chain_verification.md) for how `verifyProofOnChain` uses these.

## 3) Generate a proof

```ts
import { readFileSync } from "fs";
import { ProofStatus } from "@zk-email/sdk";

const prover = blueprint.createProver();
const eml = readFileSync("password-reset-request.eml", "utf-8");
const proof = await prover.generateProof(eml);

console.log("Proof ID:", proof.props.id);
console.log("Status:", ProofStatus[proof.props.status!]);
console.log("Public data:", proof.props.publicData);
```

This generates the proof server-side and polls until it's done - `generateProof` only resolves once `status` is `Done` or `Failed`.

## 4) Verify the proof on-chain

```ts
import { verifyProofOnChain } from "@zk-email/sdk";

const result = await verifyProofOnChain(proof);
console.log("On-chain verification result:", result);
```

`verifyProofOnChain` resolves to a real boolean rather than throwing: `true` if the deployed verifier contract accepts the proof, `false` if it reverts (e.g. a tampered proof). See [`tests/integration/kusama/verifyProofOnChain.test.ts`](../../../tests/integration/kusama/verifyProofOnChain.test.ts) for both cases exercised automatically in CI.

## Full example

All steps combined into one script, including encoding the proof for on-chain calldata, run once against [`https://staging-conductor.zk.email`](https://staging-conductor.zk.email) (the same environment the automated CI test targets). Save this as `demo.ts`:

```ts
import {
  initZkEmailSdk,
  verifyProofOnChain,
  encodeProofForOnChainVerification,
  ProofStatus,
} from "@zk-email/sdk";
import { readFileSync } from "fs";

const sdk = initZkEmailSdk({ baseUrl: "https://staging-conductor.zk.email" });

const blueprint = await sdk.getBlueprintById("e94e7f93-7575-4e26-a147-de894b19ce3e");
console.log("Blueprint:", blueprint.props.slug);
console.log("Verifier contract:", blueprint.props.verifierContract);

const prover = blueprint.createProver();
const eml = readFileSync("password-reset-request.eml", "utf-8");
const proof = await prover.generateProof(eml);

console.log("Proof ID:", proof.props.id);
console.log("Status:", ProofStatus[proof.props.status!]);
console.log("Public data:", proof.props.publicData);

const result = await verifyProofOnChain(proof);
console.log("On-chain verification result:", result);

const { proofBytes, publicInputs } = encodeProofForOnChainVerification(proof);
console.log("Proof bytes:", proofBytes);
console.log("Public inputs:", publicInputs);

const rpcUrl = "https://services.polkadothub-rpc.com/testnet";
const castArgs = `"verify(bytes,bytes32[])" ${proofBytes} "[${publicInputs.join(",")}]"`;

console.log("\nFor those who want to submit this proof as an on-chain transaction with cast:");
console.log(
  `cast send ${blueprint.props.verifierContract!.address} ${castArgs} --rpc-url ${rpcUrl} --private-key $PRIVATE_KEY`
);
```

Run it:

```bash
npx tsx demo.ts
```

Output from a real run:

```text
Blueprint: zkemailverify/kusama_grant_paseo_e2e
Verifier contract: { address: '0x72616B78d29d0cccBfEec1bf00E108885286D2f3', chain: 420420417 }
Proof ID: 4c6d3201-e419-450e-9b8a-9af965e37615
Status: Done
Public data: { email_sender: [ 'info@x.com' ] }
On-chain verification result: true
Proof bytes: 0x0baf4b32210d92570fab25e2dca2c3cb555a155cf3ea348538753600e76027770b70f52d2193b7ae9673770221cd462b3270d873f8cb600848649244417955a327f3f708dcc1f627d213a5e2660f72320d5263a5d86325c91e5d6673344f028b077c33ace8dcde1184684b7ae08fe95f64deef7e72fac488b1cea1811bd515eb05d5b62a6514a8bfc9353614bd0b08e9218721d2bd9cad742b830b1f4288cbb92e53c8cedbb7a7bb86a67455bf95c2ab873a86a24dfac44068131653e54b78f40f02b25a501ba4d7ce4f30f643f416a1188f427992e3b5d10559ec506229a670251385eb4597fe6fd6a0aa493434985892bbb3e2c53d84b76186428652b25039
Public inputs: [
  '0x0462b6e208f3552371d7c7d2fbeb31691e5f789b9e5f0bdfaa68a6a84f01d9aa',
  '0x0000000000000000000000000000000085fb869a94511ccbaaf108f91f59b407',
  '0x00000000000000000000000000000000f36f89025341ed6536cbe2d0d338b7a1',
  '0x000000000000000000000000000000000000000000006d6f632e78406f666e69',
  '0x0000000000000000000000000000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000000000000000000000000000'
]

For those who want to submit this proof as an on-chain transaction with cast:
cast send 0x72616B78d29d0cccBfEec1bf00E108885286D2f3 "verify(bytes,bytes32[])" 0x0baf4b32210d92570fab25e2dca2c3cb555a155cf3ea348538753600e76027770b70f52d2193b7ae9673770221cd462b3270d873f8cb600848649244417955a327f3f708dcc1f627d213a5e2660f72320d5263a5d86325c91e5d6673344f028b077c33ace8dcde1184684b7ae08fe95f64deef7e72fac488b1cea1811bd515eb05d5b62a6514a8bfc9353614bd0b08e9218721d2bd9cad742b830b1f4288cbb92e53c8cedbb7a7bb86a67455bf95c2ab873a86a24dfac44068131653e54b78f40f02b25a501ba4d7ce4f30f643f416a1188f427992e3b5d10559ec506229a670251385eb4597fe6fd6a0aa493434985892bbb3e2c53d84b76186428652b25039 "[0x0462b6e208f3552371d7c7d2fbeb31691e5f789b9e5f0bdfaa68a6a84f01d9aa,0x0000000000000000000000000000000085fb869a94511ccbaaf108f91f59b407,0x00000000000000000000000000000000f36f89025341ed6536cbe2d0d338b7a1,0x000000000000000000000000000000000000000000006d6f632e78406f666e69,0x0000000000000000000000000000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000000000000000000000000000]" --rpc-url https://services.polkadothub-rpc.com/testnet --private-key $PRIVATE_KEY
```

## Check it yourself

Independently confirm the verifier contract and the proof's on-chain result without re-running any of the above:

- Verifier contract on Blockscout: [`0x72616B78d29d0cccBfEec1bf00E108885286D2f3`](https://blockscout-testnet.polkadot.io/address/0x72616B78d29d0cccBfEec1bf00E108885286D2f3) (Polkadot Hub Testnet / Paseo)
- Blueprint page: [`kusama_grant_paseo_e2e`](https://registry-staging.onrender.com/e94e7f93-7575-4e26-a147-de894b19ce3e/versions)

## Submit it as a transaction with `cast`

`verifyProofOnChain` already confirmed the proof verifies, but that only reads the result without submitting a transaction - it doesn't leave an on-chain record. For those who want a permanent, linkable transaction, the full example above prints a ready-to-run `cast send` command for this exact proof, built with `encodeProofForOnChainVerification`, entirely independently of the SDK.

This needs a funded testnet account - create and fund one the same way as in [milestone-1's how-to](https://github.com/zkemail/zk-email-verify/blob/kusama-grant/packages/contracts/kusama-grant/milestone-1/04_public_howto.md):

```bash
cast wallet new
# Address:     0xYourAddress...
# Private key: 0xYourPrivateKey...
```

Fund it via the [Polkadot faucet](https://faucet.polkadot.io/) (select Polkadot Hub TestNet), export it, then copy the `cast send` command the script printed and run it as-is:

```bash
export PRIVATE_KEY=<the private key from cast wallet new above>
```

Example real transaction: `0xb866a4b151dfba6838ba31275afc5dbc9e45b16918f1c6a69fab1d7592364934` ([Blockscout](https://blockscout-testnet.polkadot.io/tx/0xb866a4b151dfba6838ba31275afc5dbc9e45b16918f1c6a69fab1d7592364934))
