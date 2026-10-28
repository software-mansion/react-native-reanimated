#!/usr/bin/env bash
set -euo pipefail

main() {
  APP_ROOT="${1:?usage: build-app.sh <app-root> <output.tar.gz> [Release|Debug]}"
  OUTPUT="${2:?usage: build-app.sh <app-root> <output.tar.gz> [Release|Debug]}"
  CONFIGURATION="${3:-Release}"
  DERIVED_DATA="$APP_ROOT/ios/build"
  STAGING="$(mktemp -d)"

  case "$CONFIGURATION" in
    Release | Debug) ;;
    *) fail "unknown configuration '$CONFIGURATION', expected Release or Debug" ;;
  esac

  find_workspace_and_scheme
  build
  stage_app
  if [ "$CONFIGURATION" = "Debug" ]; then
    stage_source
  fi
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
  echo "Workspace: $WORKSPACE, scheme: $SCHEME, configuration: $CONFIGURATION"
}

build() {
  xcodebuild build \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -sdk iphonesimulator \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath "$DERIVED_DATA" \
    CODE_SIGNING_ALLOWED=NO \
    -quiet
}

stage_app() {
  local products="$DERIVED_DATA/Build/Products/$CONFIGURATION-iphonesimulator"
  APP=$(find "$products" -maxdepth 1 -name '*.app' | head -n 1)
  [ -n "$APP" ] || fail "no .app in $products"
  if [ "$CONFIGURATION" = "Release" ] && [ ! -f "$APP/main.jsbundle" ]; then
    fail "the Release app has no main.jsbundle, so it would wait for a Metro server"
  fi
  cp -R "$APP" "$STAGING/"
}

stage_source() {
  local source="$STAGING/source"
  mkdir -p "$source"
  (cd "$APP_ROOT" && find . -mindepth 1 -maxdepth 1 \
    ! -name node_modules ! -name ios ! -name android ! -name .git ! -name .expo \
    -exec cp -R {} "$source/" \;)
  vendor_file_dependencies "$source"
  COPYFILE_DISABLE=1 tar --no-mac-metadata -czf "$STAGING/repro-source.tar.gz" -C "$STAGING" source
  rm -rf "$source"
  echo "Packaged the JavaScript source of $APP_ROOT for Metro"
}

vendor_file_dependencies() {
  local source="$1"
  local spec tarball name
  while IFS= read -r spec; do
    [ -n "$spec" ] || continue
    tarball="${spec#file:}"
    [[ "$tarball" = /* ]] || tarball="$APP_ROOT/$tarball"
    [ -f "$tarball" ] || fail "the dependency $spec does not point at a file"
    name=$(basename "$tarball")
    mkdir -p "$source/vendor"
    cp "$tarball" "$source/vendor/$name"
    rewrite_spec "$source/package.json" "$spec" "file:vendor/$name"
    if [ -f "$source/package-lock.json" ]; then
      rewrite_spec "$source/package-lock.json" "$spec" "file:vendor/$name"
    fi
  done < <(jq -r '[.dependencies // {}, .devDependencies // {}] | add | to_entries[] | .value | select(startswith("file:") and endswith(".tgz"))' "$source/package.json")
}

rewrite_spec() {
  local file="$1" from="$2" to="$3"
  jq --arg from "$from" --arg to "$to" \
    'walk(if type == "string" and . == $from then $to else . end)' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

package() {
  mkdir -p "$(dirname "$OUTPUT")"
  local entries=()
  while IFS= read -r entry; do
    entries+=("$entry")
  done < <(cd "$STAGING" && ls -A)
  COPYFILE_DISABLE=1 tar --no-mac-metadata -czf "$OUTPUT" -C "$STAGING" "${entries[@]}"
  echo "Packaged ${entries[*]} into $OUTPUT"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "app-name=$(basename "$APP" .app)" >> "$GITHUB_OUTPUT"
  fi
}

fail() {
  echo "::error::$1"
  exit 1
}

main "$@"
