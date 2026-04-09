#!/bin/bash

# Exit on any error
set -e

# 1. Take version argument (x.y.z)
VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./publish.sh x.y.z"
  exit 1
fi

# 2. Bail if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: You have uncommitted changes. Please commit or stash them before publishing."
  exit 1
fi

# 3. Check if current branch is 'main'
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: You must be on the 'main' branch to publish. Currently on '$CURRENT_BRANCH'."
  exit 1
fi

TAG="release-$VERSION"

# 4. Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: Tag '$TAG' already exists."
  exit 1
fi

echo "Releasing version $VERSION..."

# 5. Update version in package.json (and package-lock.json)
# Using --no-git-tag-version to create the custom format tag later
npm version "$VERSION" --no-git-tag-version

# 6. Commit the version bump
git add package.json
if [ -f package-lock.json ]; then
  git add package-lock.json
fi
git commit -m "Release $VERSION"

# 7. Create release-x.y.z tag from current main
echo "Creating tag $TAG..."
git tag "$TAG"

# 8. Push to origin (main and the new tag)
echo "Pushing main and $TAG to origin..."
git push origin main
git push origin "$TAG"

# 9. Also then run `npm publish`
echo "Publishing to npm..."
npm publish

echo "Successfully released and published $VERSION."
