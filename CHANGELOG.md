# Changelog

All notable changes to the ZK Email SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated release process with npm scripts
- Release automation script (`scripts/release.sh`)
- GitHub Actions workflow for CI/CD releases
- Comprehensive release documentation (RELEASE.md)
- Test script for dry-run releases (`scripts/release-test.sh`)

### Changed
- Enhanced CLAUDE.md with release automation instructions

### Developer Experience
- Simplified release process from multiple manual steps to single command

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