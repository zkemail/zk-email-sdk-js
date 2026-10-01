# Changelog

All notable changes to the ZK Email SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- `verifyProof` / `Proof.verify` now set the proof's `publicData` to what its verified public outputs decode to (it travels next to the proof and was previously trusted as-is). A differing `publicData` is replaced and a warning logged; verification fails only if the outputs can't be decoded for the blueprint.
- Circom and Noir public outputs are canonicalized before verification (0x-hex or decimal below the BN254 modulus; anything else is rejected); verification and decoding use the same canonical array. Also applies to `verifyProofData`.

### Fixed
- `parsePublicSignals` follows the blueprint's `internalVersion` like the server: `0002_max_length_per_regex_part` sizes each public part by its own `maxLength` (it read 0 fields per part and returned empty strings when the regex had no top-level `maxLength`).
- Noir public outputs are decoded by each part's committed length as UTF-8: bytes below 0x10 (tab, newline) were dropped, multi-byte characters were garbled, and byte slots above 0xff were accepted.
- `getDKIMSelector`, `getSenderDomain` and `testBlueprint` read d=/s= from every (folded) DKIM-Signature field instead of the first line containing "DKIM-Signature" (which also matched X-Google-DKIM-Signature); `testBlueprint` accepts the blueprint's domain if any signature has it. New `getSenderDomains`.
- A rate-limited / non-list key archive response no longer throws inside `verifyPubKey`.

## [2.0.11] - 2025-09-30

### Changed
- Improved proof status checking with exponential backoff (2s → 4s → 8s → 10s cap) instead of fixed 2.5s delay for more efficient polling

## [2.0.7] - 2025-09-24

### Fixed
- Updated DKIM archive API endpoint from `/api/key` to `/api/key/domain` for domain key fetching during verification

## [2.0.3] - 2025-09-12

### Fixed
- Reverted OAuth client ID to the authorized Google client (773062743658...) to restore functionality with existing OAuth consent screen

## [2.0.2] - 2025-09-11

### Fixed
- Updated OAuth client ID to use correct ZK Email Google client credentials for Gmail authentication

## [2.0.1] - 2025-01-19

### Fixed
- Updated README documentation to reflect the new named export pattern (`initZkEmailSdk`)
- Corrected all usage examples and import statements in documentation

## [2.0.0] - 2025-01-19

### Changed
- **BREAKING**: Changed from default export to named export `initZkEmailSdk`
  - Before: `import zkEmailSdk from '@zk-email/sdk'`
  - After: `import { initZkEmailSdk } from '@zk-email/sdk'`
- Improved dual package support for both ESM and CommonJS
- Set Circom as the default ZK framework

### Added
- Support for custom Google OAuth client ID configuration
- Buffer polyfill for better browser compatibility
- Enhanced browser testing setup

### Fixed
- Removed duplicate HTML closing tags in browser test files
- Cleaned up redundant dependencies in browser test package.json

## [1.3.0-3] - Previous Release

### Added
- Initial SDK implementation with Blueprint system
- Support for Gmail and Outlook OAuth flows
- Local and remote proof generation
- Web Worker for browser-based proving
- SP1, Circom, and Noir prover implementations