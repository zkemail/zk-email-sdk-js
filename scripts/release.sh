#!/bin/bash

# Release automation script for ZK Email SDK
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting release process for ${VERSION_TYPE} version...${NC}"

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Check if we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: You're not on main branch. Continue? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Current version: ${CURRENT_VERSION}${NC}"

# Check CHANGELOG.md has unreleased content
if ! grep -q "\[Unreleased\]" CHANGELOG.md; then
    echo -e "${RED}Error: No [Unreleased] section in CHANGELOG.md${NC}"
    exit 1
fi

# Bump version
echo -e "${GREEN}Bumping ${VERSION_TYPE} version...${NC}"
npm version ${VERSION_TYPE} --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: ${NEW_VERSION}${NC}"

# Update CHANGELOG.md
TODAY=$(date +%Y-%m-%d)
sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [${NEW_VERSION}] - ${TODAY}/" CHANGELOG.md
rm CHANGELOG.md.bak

# Commit changes
git add package.json CHANGELOG.md
git commit -m "chore: release v${NEW_VERSION}"

# Create tag
git tag "v${NEW_VERSION}"

# Build and publish to npm
echo -e "${GREEN}Building and publishing to npm...${NC}"
bun run build
npm publish --access public

# Push to GitHub
echo -e "${GREEN}Pushing to GitHub...${NC}"
git push origin main
git push origin "v${NEW_VERSION}"

# Create GitHub release
echo -e "${GREEN}Creating GitHub release...${NC}"
# Extract release notes from CHANGELOG
RELEASE_NOTES=$(sed -n "/## \[${NEW_VERSION}\]/,/## \[/p" CHANGELOG.md | sed '$d')

gh release create "v${NEW_VERSION}" \
  --title "v${NEW_VERSION}" \
  --notes "${RELEASE_NOTES}"

echo -e "${GREEN}✅ Release v${NEW_VERSION} completed successfully!${NC}"
echo -e "${YELLOW}Don't forget to add new entries to the [Unreleased] section of CHANGELOG.md for future releases.${NC}"