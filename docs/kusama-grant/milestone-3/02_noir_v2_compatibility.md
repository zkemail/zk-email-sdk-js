# 02 - Noir v2.0.0 Proof Output Compatibility

Deliverable mapping: Milestone 3, Noir v2.0.0 Proof Output Compatibility.

## What was delivered

The SDK was updated to parse and verify Noir proof outputs that match the `zkemail.nr` v2.0.0 public output layout, which introduces a new `pubkey_redc_hash` field.

### Public output layout change

`zkemail.nr` v2.0.0 adds a Barrett reduction precomputed value (`redc_param`) hash as a second public output, shifting all subsequent fields by one:

| Index | v1.x | v2.0.0 |
| --- | --- | --- |
| 0 | `pubkey_modulus_hash` | `pubkey_modulus_hash` |
| 1 | `email_nullifier` | `pubkey_redc_hash` *(new)* |
| 2 | `header_hash[0]` | `email_nullifier` |
| 3 | `header_hash[1]` | `header_hash[0]` |
| 4 | `prover_address` | `header_hash[1]` |
| 5 | *(first regex output)* | `prover_address` |
| 6+ | — | *(first regex output)* |

`publicOutputIterator` in `parseNoirPublicOutputs` was bumped from `5` to `6` to account for this.

### Noir pubkey verification

`verifyPubKey` in `src/utils/index.ts` was split into separate paths for Circom and Noir:

- **Circom path (unchanged):** Uses Poseidon hash over 121-bit RSA chunks (17 limbs).
- **Noir path (new):** Uses `hashRSAPublicKey()` from `@zk-email/zkemail-nr`, which hashes the modulus over **120-bit limbs** (9 limbs for RSA-1024, 18 limbs for RSA-2048). A helper `bigIntToLimbs(num, bitsPerLimb, numLimbs)` converts the modulus BigInt to the expected limb array. Dummy `redc` limbs are passed since only the modulus hash is needed for verification.

## Implementation Notes

- **Public output parsing:** [`src/prover/noir/index.ts`](../../../src/prover/noir/index.ts) — `parseNoirPublicOutputs`, `publicOutputIterator = 6`.
- **Pubkey verification split:** [`src/utils/index.ts`](../../../src/utils/index.ts) — separate `if (zkFramework === ZkFramework.Circom)` and `if (zkFramework === ZkFramework.Noir)` blocks.
- **Limb conversion:** `bigIntToLimbs(num, 120, numLimbs)` extracts little-endian 120-bit limbs from the RSA modulus BigInt.
- **Dependency added:** `@zk-email/zkemail-nr@^2.0.0` in `package.json`.

## Repo Evidence

- Public output iterator and layout:
  - `src/prover/noir/index.ts` (`parseNoirPublicOutputs`)
- Noir pubkey verification and limb splitting:
  - `src/utils/index.ts` (`verifyPubKey`, `bigIntToLimbs`)
- Unit tests updated for new layout:
  - `unit_tests/parseNoirPublicOutputs.test.ts`

## Status

`Delivered`
