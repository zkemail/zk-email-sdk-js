#!/bin/bash

# Test/Dry-run version of release script
# This simulates the release process without actually publishing

set -e

VERSION_TYPE=${1:-patch}
DRY_RUN=${2:-true}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== RELEASE TEST MODE ===${NC}"
echo -e "${YELLOW}This will simulate the release process without publishing${NC}\n"

# Check if there are uncommitted changes
echo -e "${GREEN}✓ Checking for uncommitted changes...${NC}"
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}Warning: You have uncommitted changes (this would fail in real release)${NC}"
fi

# Check branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${GREEN}✓ Current branch: ${BRANCH}${NC}"
if [ "$BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: Not on main branch (this would prompt in real release)${NC}"
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓ Current version: ${CURRENT_VERSION}${NC}"

# Check CHANGELOG.md
echo -e "${GREEN}✓ Checking CHANGELOG.md...${NC}"
if ! grep -q "\[Unreleased\]" CHANGELOG.md; then
    echo -e "${RED}Error: No [Unreleased] section in CHANGELOG.md${NC}"
    exit 1
else
    echo "  Found [Unreleased] section"
    UNRELEASED_CONTENT=$(sed -n '/## \[Unreleased\]/,/## \[/p' CHANGELOG.md | tail -n +2)
    if [ ${#UNRELEASED_CONTENT} -lt 30 ]; then
        echo -e "${YELLOW}  Warning: [Unreleased] section seems empty${NC}"
    fi
fi

# Calculate new version
echo -e "${GREEN}✓ Calculating new version (${VERSION_TYPE})...${NC}"
NEW_VERSION=$(node -e "
  const current = '${CURRENT_VERSION}'.split('.').map(Number);
  const type = '${VERSION_TYPE}';
  if (type === 'major') { current[0]++; current[1] = 0; current[2] = 0; }
  else if (type === 'minor') { current[1]++; current[2] = 0; }
  else { current[2]++; }
  console.log(current.join('.'));
")
echo -e "  New version would be: ${BLUE}${NEW_VERSION}${NC}"

# Simulate CHANGELOG update
echo -e "${GREEN}✓ Would update CHANGELOG.md:${NC}"
TODAY=$(date +%Y-%m-%d)
echo -e "  [Unreleased] → [${NEW_VERSION}] - ${TODAY}"

# Show what would be committed
echo -e "${GREEN}✓ Would commit with message:${NC}"
echo -e "  ${BLUE}chore: release v${NEW_VERSION}${NC}"

# Show tag that would be created
echo -e "${GREEN}✓ Would create tag:${NC}"
echo -e "  ${BLUE}v${NEW_VERSION}${NC}"

# Test build
echo -e "${GREEN}✓ Testing build...${NC}"
if bun run build > /dev/null 2>&1; then
    echo "  Build successful"
else
    echo -e "${RED}  Build failed! Fix before releasing${NC}"
    exit 1
fi

# Simulate npm publish
echo -e "${GREEN}✓ Would run:${NC}"
echo -e "  ${BLUE}npm publish --access public --dry-run${NC}"
echo -e "${YELLOW}  Running npm publish dry-run to validate...${NC}"
npm publish --access public --dry-run

# Show GitHub commands
echo -e "${GREEN}✓ Would push to GitHub:${NC}"
echo -e "  ${BLUE}git push origin main${NC}"
echo -e "  ${BLUE}git push origin v${NEW_VERSION}${NC}"

# Show release creation
echo -e "${GREEN}✓ Would create GitHub release:${NC}"
echo -e "  ${BLUE}gh release create v${NEW_VERSION}${NC}"

echo -e "\n${GREEN}=== TEST COMPLETE ===${NC}"
echo -e "${YELLOW}To run the actual release, use: ./scripts/release.sh ${VERSION_TYPE}${NC}"
echo -e "${YELLOW}Or remove --dry-run from npm publish in this script${NC}"