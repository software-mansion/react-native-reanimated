#!/bin/bash
set -e

WORKING_DIR="$1"
BASE_BRANCH="$2"

echo "Checking Ruby and cocoapods versions in $WORKING_DIR"
cd "$WORKING_DIR"

GEM_LOCK="Gemfile.lock"
POD_LOCK="Podfile.lock"

if [[ "$WORKING_DIR" == *macos-example ]]; then
  POD_LOCK="macos/Podfile.lock"
else
  POD_LOCK="ios/Podfile.lock"
fi

HAS_DIFF=false

git fetch origin "$BASE_BRANCH"

if [ -f "$GEM_LOCK" ]; then
  if git diff --name-only origin/"$BASE_BRANCH" -- "$GEM_LOCK" | grep -q "$GEM_LOCK"; then
    CURRENT_RUBY=$(grep -A1 "RUBY VERSION" "$GEM_LOCK" | tail -n1 | awk '{print $2}')
    PREV_RUBY=$(git show origin/"$BASE_BRANCH":"$GEM_LOCK" | grep -A1 "RUBY VERSION" | tail -n1 | awk '{print $2}')

    if [ "$CURRENT_RUBY" != "$PREV_RUBY" ]; then
      echo "$WORKING_DIR | Ruby version changed: $PREV_RUBY → $CURRENT_RUBY"
      HAS_DIFF=true
    else
      echo "$WORKING_DIR | Ruby version unchanged: ($CURRENT_RUBY)"
    fi
  else
    echo "$GEM_LOCK did not change - skipping ruby version check"
  fi
else
  echo "No Gemfile.lock found in $WORKING_DIR"
fi

if [ -f "$POD_LOCK" ]; then
  if git diff --name-only origin/"$BASE_BRANCH" -- "$POD_LOCK" | grep -q "$POD_LOCK"; then
    CURRENT_PODS=$(grep "COCOAPODS:" "$POD_LOCK" | awk '{print $2}')
    PREV_PODS=$(git show origin/"$BASE_BRANCH":"$POD_LOCK" | grep "COCOAPODS:" | awk '{print $2}')

    if [ "$CURRENT_PODS" != "$PREV_PODS" ]; then
      echo "$WORKING_DIR | cocoapods version changed: $PREV_PODS → $CURRENT_PODS"
      HAS_DIFF=true
    else
      echo "$WORKING_DIR | cocoapods version unchanged: ($CURRENT_PODS)"
  else
    echo "$POD_LOCK did not change - skipping cocoapods version check"
  fi
else
  echo "No Podfile.lock found at $POD_LOCK"
fi

if [ "$HAS_DIFF" = true ]; then
  echo ""
  echo "Ruby or cocoapods version change detected in $WORKING_DIR."
  exit 1
fi

echo ""
echo "Versions consistent."