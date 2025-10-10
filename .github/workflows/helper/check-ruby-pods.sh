#!/bin/bash
set -e

WORKING_DIR="$1"

echo "Checking Ruby and cocoapods versions in $WORKING_DIR"
cd "$WORKING_DIR"

GEM_LOCK="Gemfile.lock"
POD_LOCK="Podfile.lock"

EXPECTED_RUBY="3.3.6p108"
EXPECTED_PODS="1.15.2"

if [[ "$WORKING_DIR" == *macos-example ]]; then
  POD_LOCK="macos/Podfile.lock"
else
  POD_LOCK="ios/Podfile.lock"
fi

HAS_DIFF=false

if [ -f "$GEM_LOCK" ]; then
  CURRENT_RUBY=$(grep -A1 "RUBY VERSION" "$GEM_LOCK" | tail -n1 | awk '{print $2}')
  if [ "$CURRENT_RUBY" != "$EXPECTED_RUBY" ]; then
    echo "$WORKING_DIR | Ruby version changed: $PREV_RUBY → $CURRENT_RUBY"
    HAS_DIFF=true
  else
    echo "$WORKING_DIR | Ruby version is ok: ($CURRENT_RUBY)"
  fi
else
  echo "No Gemfile.lock found in $WORKING_DIR"
fi

if [ -f "$POD_LOCK" ]; then
  CURRENT_PODS=$(grep "COCOAPODS:" "$POD_LOCK" | awk '{print $2}')
  if [ "$CURRENT_PODS" != "$EXPECTED_PODS" ]; then
    echo "$WORKING_DIR | cocoapods version changed: $PREV_PODS → $CURRENT_PODS"
    HAS_DIFF=true
  else
    echo "$WORKING_DIR | cocoapods version is ok: ($CURRENT_PODS)"
  fi
else
  echo "No Podfile.lock found at $POD_LOCK"
fi

if [ "$HAS_DIFF" = true ]; then
  echo ""
  echo "Ruby or cocoapods version change detected in $WORKING_DIR."
  echo "Please make sure that you use following versions:"
  echo "- ruby: $EXPECTED_RUBY"
  echo "- cocoapods: $EXPECTED_PODS"
  exit 1
fi

echo ""
echo "Versions consistent."