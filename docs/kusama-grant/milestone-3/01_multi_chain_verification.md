# 01 - Multi-Chain On-Chain Verification

Deliverable mapping: Milestone 3, Multi-Chain On-Chain Verification.

## What was delivered

`verifyProofOnChain` in [`src/chain/index.ts`](../../../src/chain/index.ts) was rewritten to:

- **Support multiple chains:** Ethereum Sepolia (`11155111`) and Paseo Testnet / Polkadot Hub Testnet (`420420417`). The chain is looked up from `proof.blueprint.props.verifierContract.chain` via a `CHAIN_MAP`.
- **Use the new verifier ABI:** The on-chain call now targets `verify(bytes proof, bytes32[] publicInputs)` instead of the old `verify(uint8 proofType, uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[N] signals)` interface.
- **Encode the proof as ABI-packed bytes:** `pA`, `pB` (with coordinate swap), and `pC` are ABI-encoded into a single `bytes` parameter via viem's `encodeAbiParameters`.
- **Convert public signals to `bytes32[]`:** Each public output is padded to 32 bytes using viem's `toHex`.
- **Remove `snarkjs` dependency:** The `snarkjs.groth16.exportSolidityCallData` call and the `snarkjs` import were removed; all encoding is now done with viem.
- **Define Paseo as a custom viem chain:** Chain ID `420420417` is defined using `defineChain` with the Polkadot Hub Testnet RPC URL (`https://services.polkadothub-rpc.com/testnet`).

Base Sepolia (`84532`) was also added back as a supported chain in `CHAIN_MAP`.

## Implementation Notes

- **Chain map:** `CHAIN_MAP: Record<number, Chain>` maps `11155111 → sepolia`, `420420417 → paseoTestnet`, `84532 → baseSepolia`.
- **Proof encoding:**
  ```
  pA: [BigInt(pi_a[0]), BigInt(pi_a[1])]
  pB: [[pi_b[0][1], pi_b[0][0]], [pi_b[1][1], pi_b[1][0]]]  // coordinates swapped
  pC: [BigInt(pi_c[0]), BigInt(pi_c[1])]
  proofBytes = encodeAbiParameters("uint256[2], uint256[2][2], uint256[2]", [pA, pB, pC])
  ```
- **Public inputs encoding:** `publicInputs = publicOutputs.map(o => toHex(BigInt(o), { size: 32 }))`.
- **No-op on verification success:** The verifier contract reverts on failure; `readContract` not throwing is treated as `true`.
- **Fix:** `verifyProofOnChain` now correctly returns the boolean result instead of always returning `true`.

## Repo Evidence

- Chain map, Paseo chain definition, ABI, and proof encoding:
  - `src/chain/index.ts`
- Boolean return fix:
  - `src/blueprint.ts`

## Demonstration

```typescript
import { verifyProofOnChain } from "@zk-email/sdk";

// proof.blueprint.props.verifierContract = { chain: 420420417, address: "0x..." }
const verified = await blueprint.verifyProofOnChain(proof);
console.log(verified); // true if on-chain verification passed
```

## Status

`Delivered`
