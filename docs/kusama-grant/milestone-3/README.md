# Milestone 3 - SDK On-Chain Verification

Primary Goal: Integrate on-chain proof verification into the SDK using the generic verifier interface defined in Milestone 2.

## Deliverables (this repository)

| # | Name | Description | Deliverable | What was done / Proof |
| --- | --- | --- | --- | --- |
| 4 | SDK On-Chain Verification | Integrate on-chain proof verification into the SDK using the generic verifier interface defined in Milestone 2. | SDK functionality enabling on-chain proof verification via deployed verifier contracts | `verifyProofOnChain` supports Ethereum Sepolia, Base Sepolia, and Paseo Testnet (Polkadot) against the `IZKEmailVerifier` ABI, viem-encoded. Published to npm and consumed by the registry frontend. **Proof:** [`04_sdk_on_chain_verification.md`](./04_sdk_on_chain_verification.md). |

## Current Status

- SDK On-Chain Verification: `In Progress`

## Evidence Index

- [`04_sdk_on_chain_verification.md`](./04_sdk_on_chain_verification.md)
- [`05_public_howto.md`](./05_public_howto.md)
