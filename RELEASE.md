# Release Process

This document describes the automated release process for the ZK Email SDK.

## Quick Release Commands

### Option 1: Using npm scripts (Simplest)
```bash
# For bug fixes (1.0.0 -> 1.0.1)
bun run release:patch

# For new features (1.0.0 -> 1.1.0)
bun run release:minor

# For breaking changes (1.0.0 -> 2.0.0)
bun run release:major
```

### Option 2: Using release script (Recommended)
```bash
# Handles changelog updates automatically
./scripts/release.sh patch  # or minor/major
```

### Option 3: GitHub Actions (CI/CD)
- Push a tag: `git tag v2.1.0 && git push origin v2.1.0`
- Or use GitHub UI: Actions → Release Workflow → Run workflow

## Before Releasing

1. **Update CHANGELOG.md**
   - Add your changes under `[Unreleased]` section
   - Use categories: Added, Changed, Fixed, etc.
   - Mark breaking changes with **BREAKING**

2. **Ensure clean working directory**
   ```bash
   git status  # Should be clean
   git pull origin main  # Get latest changes
   ```

3. **Run checks**
   ```bash
   bun run typecheck
   bun run build  # Ensure it builds
   ```

## Manual Release Process (if automation fails)

1. **Update version**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Update CHANGELOG**
   - Move `[Unreleased]` to `[X.X.X] - YYYY-MM-DD`
   - Add new `[Unreleased]` section

3. **Commit and tag**
   ```bash
   git add -A
   git commit -m "chore: release vX.X.X"
   git tag vX.X.X
   ```

4. **Publish**
   ```bash
   bun run publish
   git push origin main --tags
   ```

5. **Create GitHub release**
   ```bash
   gh release create vX.X.X --generate-notes
   ```

## Setting Up Automation (One-time)

### Required Secrets
Add to GitHub repository settings → Secrets:
- `NPM_TOKEN`: Get from npm.js → Access Tokens → Generate New Token

### Recommended VSCode Extension
Install "Conventional Commits" extension for consistent commit messages.

## Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **PATCH** (X.X.1): Bug fixes, documentation updates
  - Example: Fix typo, update README
  
- **MINOR** (X.1.0): New features, backwards compatible
  - Example: Add new method, new optional parameter
  
- **MAJOR** (1.0.0): Breaking changes
  - Example: Change function signature, remove feature

## Troubleshooting

### npm publish fails
- Check npm login: `npm whoami`
- Login if needed: `npm login`

### GitHub release fails
- Check gh auth: `gh auth status`
- Login if needed: `gh auth login`

### Version conflict
- Pull latest: `git pull origin main`
- Check npm: `npm view @zk-email/sdk version`

## Example Release Flow

```bash
# 1. Developer makes changes
git add .
git commit -m "feat: add new proof validation method"

# 2. Update changelog
echo "### Added
- New proof validation method" >> CHANGELOG.md

# 3. Release (automated)
./scripts/release.sh minor

# ✅ Script handles:
# - Version bump (1.2.0 -> 1.3.0)
# - Changelog update
# - npm publish
# - Git tag & push
# - GitHub release
```