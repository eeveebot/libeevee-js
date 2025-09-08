#!/bin/bash

# where this .sh file lives
DIRNAME=$(dirname "$0")
SCRIPT_DIR=$(cd "$DIRNAME" || exit 1; pwd)
cd "$SCRIPT_DIR" || exit 1


# Check if a version argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

VERSION=$1

export VERSION

jq ".version = \"${VERSION}\"" package.json | tee package.json.new

mv package.json.new package.json

git add package.json

git commit -m "version $VERSION"

git tag $VERSION

git push
git push --tags
