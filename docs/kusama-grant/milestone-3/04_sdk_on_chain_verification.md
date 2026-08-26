# 04 - SDK On-Chain Verification

Milestone 3 SDK integration: `verifyProofOnChain` verifies Circom proofs on-chain against a deployed `IZKEmailVerifier` contract, on Ethereum Sepolia, Base Sepolia, or Paseo Testnet (Polkadot). For a step-by-step usage walkthrough (fetch blueprint, generate proof, verify on-chain), see [`05_public_howto.md`](./05_public_howto.md).

## Implementation Notes

- **Multi-chain support:** `verifyProofOnChain` in [`src/chain/index.ts`](../../../src/chain/index.ts) looks up the target chain from `proof.blueprint.props.verifierContract.chain` via a `CHAIN_MAP: Record<number, Chain>` (`11155111 → sepolia`, `84532 → baseSepolia`, `420420417 → paseoTestnet`). Paseo is defined as a custom viem chain (`defineChain`) using the Polkadot Hub Testnet RPC (`https://services.polkadothub-rpc.com/testnet`).
- **Verifier ABI:** the on-chain call targets `verify(bytes proof, bytes32[] publicInputs)`, matching the `IZKEmailVerifier` interface from Milestone 2.
- **Proof encoding:** `pA`, `pB` (coordinate-swapped), and `pC` are ABI-encoded into a single `bytes` parameter via viem's `encodeAbiParameters`; each public output is padded to 32 bytes via `toHex`.
- **Return value:** [`Blueprint.verifyProofOnChain`](../../../src/blueprint.ts) wraps the call and returns the actual boolean result: `true` if the contract accepts the proof, `false` if it reverts (invalid/tampered proof).

## Demonstration

```bash
bun run test:integration
```

Real (no mocking) on-chain verification test at [`tests/integration/kusama/verifyProofOnChain.test.ts`](../../../tests/integration/kusama/verifyProofOnChain.test.ts), against the [`kusama_grant_paseo_e2e` blueprint](https://registry-staging.onrender.com/e94e7f93-7575-4e26-a147-de894b19ce3e/versions) (`e94e7f93-7575-4e26-a147-de894b19ce3e`), compiled and deployed to Paseo Testnet through the current pipeline:

| Test | Exercises |
| --- | --- |
| verifies a real proof against the deployed Paseo verifier | A real, already-completed proof succeeds against the deployed verifier contract (`0x72616B78d29d0cccBfEec1bf00E108885286D2f3`) on Paseo Testnet (Polkadot), via the standalone `verifyProofOnChain` function. |
| rejects a tampered proof | A proof with a corrupted signal correctly resolves `false` rather than being accepted, via the standalone function. |
| `blueprint.verifyProofOnChain` verifies a real proof against the deployed Paseo verifier | Same real proof, through `Blueprint.verifyProofOnChain` - the method the registry UI actually calls. |
| `blueprint.verifyProofOnChain` rejects a tampered proof | Same tampered proof, through `Blueprint.verifyProofOnChain`. Added after a curator review (2026-08-11) found this method discarded the standalone call's result and always returned `true` unless the SDK itself threw, so a tampered proof reported success through the method the UI uses. Fixed in [#104](https://github.com/zkemail/zk-email-sdk-js/pull/104); this case pins the regression. |

Runs automatically in CI: on every pull request via [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) (`test` job), and again on every push to `staging` via [`.github/workflows/nightly-release.yml`](../../../.github/workflows/nightly-release.yml) as a gate before a nightly release is published - a broken on-chain verification path blocks the release from shipping.

Example passing `test` job, with the `blueprint.verifyProofOnChain` fix and its regression tests: [`manifest.json#L13-L16`](./manifest.json#L13-L16). Example passing nightly release run including this check, published as `3.0.0-nightly.36`: [`manifest.json#L18-L21`](./manifest.json#L18-L21). For the current state of the branch, see the [Actions tab](https://github.com/zkemail/zk-email-sdk-js/actions/workflows/nightly-release.yml?query=branch%3Astaging).
