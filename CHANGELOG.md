# Changelog

All notable changes to the ZK Email SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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