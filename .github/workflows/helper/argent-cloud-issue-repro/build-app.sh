#!/usr/bin/env bash
set -euo pipefail

main() {
  APP_ROOT="${1:?usage: build-app.sh <app-root> <output.tar.gz>}"
  OUTPUT="${2:?usage: build-app.sh <app-root> <output.tar.gz>}"
  DERIVED_DATA="$APP_ROOT/ios/build"

  find_workspace_and_scheme
  build
  package
}

find_workspace_and_scheme() {
  WORKSPACE=$(find "$APP_ROOT/ios" -maxdepth 1 -name '*.xcworkspace' | head -n 1)
  [ -n "$WORKSPACE" ] || fail "no .xcworkspace in $APP_ROOT/ios"
  local workspace_name
  workspace_name=$(basename "$WORKSPACE" .xcworkspace)
  SCHEME=$(xcodebuild -list -json -workspace "$WORKSPACE" \
    | jq -r --arg name "$workspace_name" '
        .workspace.schemes as $schemes
        | ($schemes | map(select(. == $name)) | first)
          // ($schemes | map(select(startswith("Pods") | not)) | first)')
  [ -n "$SCHEME" ] && [ "$SCHEME" != "null" ] || fail "no buildable scheme in $WORKSPACE"
  echo "Workspace: $WORKSPACE, scheme: $SCHEME"
}

build() {
  xcodebuild build \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -sdk iphonesimulator \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath "$DERIVED_DATA" \
    CODE_SIGNING_ALLOWED=NO \
    -quiet
}

package() {
  local products="$DERIVED_DATA/Build/Products/Release-iphonesimulator"
  local app
  app=$(find "$products" -maxdepth 1 -name '*.app' | head -n 1)
  [ -n "$app" ] || fail "no .app in $products"
  mkdir -p "$(dirname "$OUTPUT")"
  tar -czf "$OUTPUT" -C "$products" "$(basename "$app")"
  echo "Packaged $app into $OUTPUT"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "app-name=$(basename "$app" .app)" >> "$GITHUB_OUTPUT"
  fi
}

fail() {
  echo "::error::$1"
  exit 1
}

main "$@"
