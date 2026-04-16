# Milestone 3 - SDK Multi-Chain On-Chain Verification

Primary Goal: Update `@zk-email/sdk` to support on-chain proof verification against PolkaVM/Paseo Testnet in addition to Ethereum Sepolia, using the new `ZKEmailVerifier` ABI, and to stay compatible with `zkemail.nr` v2.0.0 Noir proof output format.

## Deliverables (this repository)

| # | Name | Description | Status |
| --- | --- | --- | --- |
| 1 | Multi-Chain On-Chain Verification | Update `verifyProofOnChain` to support Ethereum Sepolia and Paseo Testnet (Polkadot), with new verifier ABI `verify(bytes proof, bytes32[] publicInputs)` and viem-based proof encoding. | `Delivered` |
| 2 | Noir v2.0.0 Proof Output Compatibility | Update Noir public output parsing and public key verification to match `zkemail.nr` v2.0.0, which adds a `pubkey_redc_hash` output field. | `Delivered` |

## Evidence Index

- [`01_multi_chain_verification.md`](./01_multi_chain_verification.md)
- [`02_noir_v2_compatibility.md`](./02_noir_v2_compatibility.md)
