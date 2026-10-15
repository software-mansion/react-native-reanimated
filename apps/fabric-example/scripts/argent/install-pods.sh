#!/bin/sh

# CocoaPods step of the Argent Cloud remote build (see apps/fabric-example/argent-build.yaml).
# Runs inside the build VM with the monorepo root as the working directory.
#
# Mirrors .github/actions/install-pods (bundle install + pod update), minus the
# cache. The VM image carries a few rbenv Rubies but not necessarily the one
# in .ruby-version, so fall back to the newest installed Ruby 3 in that case
# (the Gemfile only asks for >= 2.6.10).

set -eu

WANTED=$(cat .ruby-version)

if command -v rbenv > /dev/null 2>&1 && ! rbenv versions --bare | grep -qx "$WANTED"; then
  FALLBACK=$(rbenv versions --bare | grep -E '^3\.' | sort -V | tail -1)
  if [ -z "$FALLBACK" ]; then
    echo "Ruby $WANTED is not installed on the build VM and no Ruby 3 is available" >&2
    rbenv versions >&2
    exit 1
  fi
  echo "Ruby $WANTED is not installed on the build VM; using $FALLBACK"
  export RBENV_VERSION=$FALLBACK
fi

ruby --version
yarn workspace fabric-example build
