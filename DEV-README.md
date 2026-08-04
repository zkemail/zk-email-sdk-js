# zk-email-sdk-js

With the ZK Email SDK you can easily compile zk regex circuits and directly create proofs with them.

For demos on how to use this repo, refer to our demo [https://github.com/zkemail/sdk-ts-demo](demo).

## Test a decomposed regex locally

Install Bun:

`curl -fsSL https://bun.sh/install | bash`

Install dependencies:

`bun i`

## Note

This first version of this SDK does not support compiling the circuits and running the proofs without our infra,
but it is our priority to make this work with your own ifra easily, too.

## Setup

This project uses bun. So to install packages use `bun i`.

## Run integration tests

Before you can run the tests, you must have the conductor running.

NOTE: Not all tests are currently working, due to changes to the interfaces and the backend.

Then you can run `bun test`.

### Directly start downloads

To run the `start download` test, you first have to compile the TypeScript files to js with `bun run build`.

If you have python installed run `python -m http.server 8000`. Then you can go to
`http://localhost:8000/integration_tests/start_downlaod_in_browser.html` and click the download button.

## Updating localProverWorker.js

For local proving, we use a javascript WebWorker. In order to make this compatible with any bundler, we first build the worker file using vite.
This will inline all dependencies and remove import statements. The next step is to generate a string from this file. Now we can
use the worker in a native js way by passing a string to the worker.

To generate the `localProverWorkerString.ts` file which is passed into the worker, run:

`bun run build-prove-worker`.

# 🚀 Release Management Strategy

The ZK Email SDK uses a fully automated semantic versioning strategy that supports both stable releases and pre-release/nightly versions for testing breaking changes.

## 📋 Release Types & Commands

### Stable Releases (Published to `latest` tag)

```bash
# Patch release (2.0.4 → 2.0.5) - Bug fixes only
bun run release:patch

# Minor release (2.0.5 → 2.1.0) - New features, backward compatible  
bun run release:minor

# Major release (2.1.0 → 3.0.0) - Breaking changes
bun run release:major
```

### Pre-release/Alpha Releases (Published to `alpha` tag)

```bash
# Breaking changes preview (2.0.4 → 3.0.0-alpha.1)
bun run release:alpha-major

# New feature preview (2.0.4 → 2.1.0-alpha.1)  
bun run release:alpha-minor

# Continue alpha development (3.0.0-alpha.1 → 3.0.0-alpha.2)
bun run release:alpha

# Move to beta testing (3.0.0-alpha.5 → 3.0.0-beta.1)
bun run release:beta

# Release candidate (3.0.0-beta.2 → 3.0.0-rc.1)
bun run release:rc
```

## 🎯 Common Usage Scenarios

### Scenario 1: Breaking Blueprint Changes for Registry
```bash
# Current stable: 2.0.4
# You have breaking changes that will eventually become v3.0.0

bun run release:alpha-major
# ✅ Publishes: 3.0.0-alpha.1 with "alpha" tag

# Registry can use: "@zk-email/sdk": "3.0.0-alpha.1" 
# Normal users still get: "@zk-email/sdk": "latest" (2.0.4)
```

### Scenario 2: Regular Feature Addition
```bash
# Current: 2.0.4  
# Added new OAuth provider (non-breaking)

bun run release:minor
# ✅ Publishes: 2.1.0 with "latest" tag
# All users automatically get the new version
```

### Scenario 3: Critical Bug Fix
```bash
# Current: 2.1.0
# Critical security fix needed

bun run release:patch  
# ✅ Publishes: 2.1.1 with "latest" tag
# Immediate fix available to all users
```

## 🤖 GitHub Actions Integration

### Manual Releases (Recommended Method)

1. Go to the **Actions** tab in GitHub
2. Select **"Release"** workflow  
3. Click **"Run workflow"**
4. Choose release type: `patch`, `minor`, `major`, `alpha-major`, etc.
5. ✅ **Fully automated** - builds, publishes, creates GitHub release

### What Happens Automatically

Each release command automatically:
- ✅ **Bumps version** in package.json using semantic versioning
- ✅ **Creates and pushes git tag**
- ✅ **Builds the project** with optimized bundles
- ✅ **Publishes to npm** with cryptographic provenance
- ✅ **Creates GitHub release** with auto-generated notes
- ✅ **Applies correct npm tags** (latest vs alpha)
- ✅ **Marks pre-releases** appropriately in GitHub

## 📊 Version Progression Examples

### Stable Development Flow
```
2.0.4 (current)
  ↓ bun run release:patch
2.0.5 (bug fixes)  
  ↓ bun run release:minor
2.1.0 (new features)
  ↓ bun run release:major  
3.0.0 (breaking changes)
```

### Pre-release Development Flow
```
2.0.4 (current stable)
  ↓ bun run release:alpha-major
3.0.0-alpha.1 (breaking preview)
  ↓ bun run release:alpha
3.0.0-alpha.2 (more changes)
  ↓ bun run release:beta
3.0.0-beta.1 (feature complete)
  ↓ bun run release:rc  
3.0.0-rc.1 (production ready)
  ↓ bun run release:major
3.0.0 (stable release)
```

## 🏷 npm Tags & Installation

### For End Users
```bash
# Latest stable version (recommended)
npm install @zk-email/sdk

# Specific stable version
npm install @zk-email/sdk@2.0.4

# Latest alpha/beta (for testing)
npm install @zk-email/sdk@alpha

# Specific alpha version
npm install @zk-email/sdk@3.0.0-alpha.1
```

### For Registry/Integration Testing
```json
{
  "dependencies": {
    "@zk-email/sdk": "3.0.0-alpha.1"  // Pin exact alpha version
  }
}
```

## 📋 Release Checklist

### Before Any Release
- [ ] **Update CHANGELOG.md** with your changes in `[Unreleased]` section
- [ ] **Test locally** to ensure everything works
- [ ] **Review breaking changes** (for major/alpha-major releases)
- [ ] **Check dependencies** are up to date

### For Breaking Changes (Major/Alpha-Major)
- [ ] **Document migration path** in CHANGELOG.md
- [ ] **Mark breaking changes** with `**BREAKING**` prefix
- [ ] **Test with registry integration** before stable release
- [ ] **Consider backwards compatibility** options

### After Release
- [ ] **Verify npm package** published correctly
- [ ] **Check GitHub release** was created
- [ ] **Test installation**: `npm install @zk-email/sdk@latest`
- [ ] **Update dependent projects** as needed
- [ ] **Announce in Discord/community** if major release

## 📝 Changelog Management

When making changes to the SDK:

### 1. Add to Unreleased Section
Always add your changes to the `[Unreleased]` section in `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- New OAuth provider for Microsoft accounts

### Fixed  
- Gmail authentication timeout issue

### BREAKING
- **Blueprint API**: Changed max_length structure for per-part configuration
```

### 2. Use Standard Categories
- **Added** - New features
- **Changed** - Changes in existing functionality  
- **Deprecated** - Soon-to-be removed features
- **Removed** - Now removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes
- **BREAKING** - Breaking changes (mark clearly!)

### 3. Automatic Changelog Updates
When you run a release command, the automation will:
- Move `[Unreleased]` content to versioned section `[X.X.X] - YYYY-MM-DD`
- Create new empty `[Unreleased]` section
- Include changelog content in GitHub release notes

## 🔧 Troubleshooting

### "npm publish failed with 403"
- Ensure npm trusted publishing is configured correctly
- Check that GitHub Actions has proper OIDC permissions
- Verify you're on the main branch with proper permissions

### "Version already exists"
- The version was already published to npm
- Use `npm version patch/minor/major` locally to bump version
- Or use a different release type (e.g., `alpha` vs `patch`)

### "GitHub release creation failed"
- Check that `GITHUB_TOKEN` has proper permissions
- Ensure you're not trying to create duplicate releases
- Verify the git tag was pushed successfully

### "Build failed during release"
- Run `bun run build` locally first to test
- Check that all dependencies are installed (`bun install`)
- Verify TypeScript compilation passes (`bun run typecheck`)

## 🎯 Best Practices

1. **Use alpha-major for breaking changes** that need testing before stable release
2. **Keep stable releases small and frequent** rather than large infrequent releases  
3. **Test alpha versions thoroughly** in registry before promoting to stable
4. **Document migration paths** clearly for any breaking changes
5. **Use GitHub Actions for releases** rather than local publishing when possible
6. **Monitor npm downloads and issues** after releases for problems
