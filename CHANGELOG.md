# Changelog

All notable changes to `@zk-email/sdk` are tracked here. Entries follow
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

## [Unreleased]

### Security

- **REG-670**: The Noir verification path now binds the Barrett reduction
  parameters (`redc`) to the DKIM public key via `pubkey_redc_hash` (the
  second public output emitted by `zkemail.nr` v2.0.0+). Previously the
  attacker-controlled `redc` limbs were not hashed into `verifyPubKey`,
  which meant a proof generated against an honest modulus but forged
  `redc` parameters could verify successfully. `verifyPubKey` now throws
  if `hashedRedcKey` is missing when `zkFramework === ZkFramework.Noir`.
  Callers that passed `ZkFramework.Noir` without a fourth argument must
  now supply the redc hash from `publicOutputs[1]`; `verifyProof` does
  this automatically.

### Changed (breaking)

- **Noir public output layout**: `parseNoirPublicOutputs` now expects the
  `zkemail.nr` v2.0.0+ layout with six fixed slots (was five):
  `[modulus_hash, redc_hash, email_nullifier, header_hash[0],
  header_hash[1], prover_address]`. Proofs generated against a
  pre-v2.0.0 circuit will fail with an explicit length check instead of
  silently returning shifted `publicData`. Regenerate Noir proofs
  against circuits compiled with `@zk-email/zkemail-nr` v2.0.0+.
- **`Blueprint.verifyProofOnChain`**: now returns the actual
  `ZKEmailVerifier.verifyEmailProof` result. Previously it always
  returned `true` regardless of on-chain outcome. Callers that treated
  a resolved promise as a successful verification must now inspect the
  boolean.
- **Noir RSA key size**: both proving (`NoirProver`) and verification
  (`verifyPubKey`) now throw an explicit error for RSA keys that are
  not 1024-bit or 2048-bit. Keys larger than 2048 bits used to be
  silently clamped to 2048 and would fail verification with a misleading
  "domains don't match" message.

### Added

- Regression tests in `unit_tests/verifyPubKey.test.ts` covering the
  REG-670 guard.
- Version-skew guard in `parseNoirPublicOutputs` with a clear error
  pointing at the zkemail.nr upgrade.

### Notes

Because of the breaking changes above, the next release should bump the
major version (or, if `3.0.0-nightly.x` ships first, carry these notes
into the `3.0.0` release entry).
