# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **ZK Email SDK**, a TypeScript library that enables creating zero-knowledge proofs about emails using regex-based blueprints. It supports both local (browser) and remote (server) proof generation, integrates with Gmail/Outlook OAuth, and provides on-chain verification capabilities.

## Development Commands

### Build Commands
- `bun run build` - Main build using Vite (generates ESM/CJS bundles)
- `bun run build-prove-worker` - Builds Web Worker for local proving 
- `bun run typecheck` - TypeScript type checking
- `bun run clean` - Remove dist directory

### Testing
Tests are currently not working due to api changes, please don't use for now.

### Publishing & Versioning

#### Changelog Management
When making changes:
1. Add entries to `[Unreleased]` section in CHANGELOG.md
2. Use categories: Added, Changed, Deprecated, Removed, Fixed, Security
3. Mark breaking changes with `**BREAKING**` and provide migration examples

#### Version Bumping
Follow semantic versioning:
- MAJOR (2.0.0): Breaking changes (e.g., export pattern changes)
- MINOR (1.X.0): New features, backwards compatible
- PATCH (1.0.X): Bug fixes

#### Publishing Process
Do not publish yourself. For reference:
- **Nightly**: Version with suffix (e.g., 1.4.0-18), keep changes in `[Unreleased]`
- **Production**: Update version, move `[Unreleased]` to `[X.X.X] - YYYY-MM-DD`, create new `[Unreleased]`

### Automated Release Commands

When the user asks to "release", "publish", or "create a new version", follow these steps:

1. **Analyze Changes**: Check CHANGELOG.md `[Unreleased]` section to determine version type:
   - Breaking changes → Major
   - New features → Minor
   - Bug fixes → Patch

2. **Pre-release Checks**:
   ```bash
   git status  # Must be clean
   git branch  # Should be on main
   grep "\[Unreleased\]" CHANGELOG.md  # Must have content
   ```

3. **Execute Release**:
   ```bash
   # Use the release script
   ./scripts/release.sh [patch|minor|major]
   ```
   
   Or manually:
   - Update package.json version
   - Update CHANGELOG.md (move Unreleased to versioned section)
   - Commit with "chore: release vX.X.X"
   - Tag with vX.X.X
   - Run `bun run publish`
   - Push commits and tags
   - Create GitHub release

4. **Inform User**: Report the new version number and provide npm/GitHub links

Example user prompts that trigger this:
- "Release a new version"
- "Can you publish this to npm?"
- "Do a patch release"
- "Release version 2.1.0"

### Core Classes
- **`Blueprint`** (`src/types/Blueprint.ts`) - Manages regex patterns and circuit compilation
- **`Prover`** (`src/prover/`) - Abstract base with SP1 and Circom implementation, NoirProver implementation seperate. User for proof generation.
- **`Proof`** (`src/types/Proof.ts`) - Represents generated proofs with verification methods
- **`Gmail`/`Outlook`** (`src/login_for_email/`) - OAuth and email fetching implementations

### Key Patterns
- **Factory Pattern**: SDK initialization via `zkSdk({ baseUrl, auth })`
- **Strategy Pattern**: Local vs remote proof generation strategies

### Entry Points
- Main SDK: `src/index.ts`
- Noir WASM initializer: `src/noir-wasm-initializer.ts`
- Web Worker: `src/prove-worker.ts`

## Directory Structure

- `src/types/` - TypeScript definitions for all components
- `src/prover/` - Proof generation logic (abstract and Noir implementations)  
- `src/login_for_email/` - OAuth flows for Gmail/Microsoft
- `src/chain/` - On-chain verification utilities
- `src/utils/` - Utility functions (hashing, file operations)
- `browser_test_proving/` - Browser environment testing
- `emls/` - Sample email files for testing

## Build Process

### Web Worker Build
1. Vite builds worker with inlined dependencies
2. Script converts to string (`localProverWorkerString.ts`)
3. Enables cross-bundler Web Worker support

### Dual Bundle Support
- ESM and CommonJS formats
- Browser/Node.js compatibility via extensive polyfills
- Multiple entry points for different use cases
