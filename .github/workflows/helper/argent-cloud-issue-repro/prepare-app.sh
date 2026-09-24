#!/usr/bin/env bash
set -euo pipefail

main() {
  PLAN_FILE="${1:?usage: prepare-app.sh <plan.json> <overlay-dir> <app-dir>}"
  OVERLAY_DIR="${2:?usage: prepare-app.sh <plan.json> <overlay-dir> <app-dir>}"
  APP_DIR="${3:?usage: prepare-app.sh <plan.json> <overlay-dir> <app-dir>}"
  ALLOWLIST_FILE="$(dirname "${BASH_SOURCE[0]}")/allowed-dependencies.json"

  read_plan
  validate_overlay
  validate_extra_dependencies
  export RCT_NEW_ARCH_ENABLED
  if [ "$ARCHITECTURE" = "paper" ]; then RCT_NEW_ARCH_ENABLED=0; else RCT_NEW_ARCH_ENABLED=1; fi

  case "$APP_KIND" in
    rn-cli) scaffold_rn_cli ;;
    expo) scaffold_expo ;;
    *) fail "unknown appKind '$APP_KIND'" ;;
  esac

  install_pods
  print_app_dir
}

read_plan() {
  plan() { jq -r "$1" "$PLAN_FILE"; }
  APP_KIND=$(plan '.appKind')
  ARCHITECTURE=$(plan '.architecture')
  RN_VERSION=$(plan '.reactNativeVersion')
  REANIMATED_VERSION=$(plan '.reanimatedVersion')
  WORKLETS_VERSION=$(plan '.workletsVersion // empty')
  EXPO_SDK_VERSION=$(plan '.expoSdkVersion // empty')
  EXTRA_DEPENDENCIES=$(plan '.extraDependencies[] | "\(.name)@\(.version)"')
}

validate_overlay() {
  [ -d "$OVERLAY_DIR" ] || return 0
  local rejected=0
  while IFS= read -r file; do
    case "$file" in
      App.tsx) ;;
      src/*.ts | src/*.tsx | src/*.js | src/*.jsx | src/*.json) ;;
      *)
        echo "::error::overlay file '$file' is not allowed; only App.tsx and src/**/*.{ts,tsx,js,jsx,json} are copied"
        rejected=1
        ;;
    esac
  done < <(cd "$OVERLAY_DIR" && find . -mindepth 1 \( -type f -o -type l \) | sed 's|^\./||')
  if [ -n "$(find "$OVERLAY_DIR" -type l)" ]; then
    echo "::error::the overlay contains symbolic links"
    rejected=1
  fi
  [ "$rejected" -eq 0 ] || fail "the overlay in $OVERLAY_DIR was rejected"
}

validate_extra_dependencies() {
  local rejected=0
  while IFS= read -r dependency; do
    [ -n "$dependency" ] || continue
    local name="${dependency%@*}"
    local version="${dependency##*@}"
    if ! jq -e --arg name "$name" 'index($name) != null' "$ALLOWLIST_FILE" > /dev/null; then
      echo "::error::dependency '$name' is not in $ALLOWLIST_FILE"
      rejected=1
    fi
    if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-.+][0-9A-Za-z.-]+)?$ ]]; then
      echo "::error::dependency '$name' must have an exact version, got '$version'"
      rejected=1
    fi
  done <<< "$EXTRA_DEPENDENCIES"
  [ "$rejected" -eq 0 ] || fail "extraDependencies were rejected"
}

scaffold_rn_cli() {
  echo "Scaffolding React Native CLI app with react-native@$RN_VERSION"
  npx @react-native-community/cli init ReproApp \
    --directory "$APP_DIR" \
    --version "$RN_VERSION" \
    --skip-install \
    --install-pods 0 \
    --skip-git-init
  (
    cd "$APP_DIR"
    npm install
    install_library_packages
  )
  write_babel_config
  copy_overlay
}

scaffold_expo() {
  [ -n "$EXPO_SDK_VERSION" ] || fail "expoSdkVersion is required for appKind 'expo'"
  echo "Scaffolding Expo app with SDK $EXPO_SDK_VERSION"
  npx create-expo-app@latest "$APP_DIR" --template "blank-typescript@sdk-$EXPO_SDK_VERSION" --no-install
  (
    cd "$APP_DIR"
    npm install
    install_library_packages
    node -e '
      const fs = require("fs");
      const config = JSON.parse(fs.readFileSync("app.json", "utf8"));
      config.expo.newArchEnabled = process.env.RCT_NEW_ARCH_ENABLED === "1";
      config.expo.ios = { ...(config.expo.ios ?? {}), bundleIdentifier: "com.swmansion.reproapp" };
      fs.writeFileSync("app.json", JSON.stringify(config, null, 2) + "\n");
    '
  )
  write_babel_config
  copy_overlay
  (cd "$APP_DIR" && npx expo prebuild --platform ios --no-install)
}

install_library_packages() {
  local packages=("react-native-reanimated@$REANIMATED_VERSION")
  if [ -n "$WORKLETS_VERSION" ]; then
    packages+=("react-native-worklets@$WORKLETS_VERSION")
  fi
  while IFS= read -r dependency; do
    [ -n "$dependency" ] && packages+=("$dependency")
  done <<< "$EXTRA_DEPENDENCIES"
  echo "Installing ${packages[*]} with lifecycle scripts disabled"
  npm install --ignore-scripts --save-exact "${packages[@]}"
}

write_babel_config() {
  local preset="module:@react-native/babel-preset"
  if [ "$APP_KIND" = "expo" ]; then
    preset="babel-preset-expo"
  fi
  local plugin="react-native-reanimated/plugin"
  if [ -n "$WORKLETS_VERSION" ]; then
    plugin="react-native-worklets/plugin"
  fi
  cat > "$APP_DIR/babel.config.js" <<BABEL
module.exports = {
  presets: ['$preset'],
  plugins: ['$plugin'],
};
BABEL
}

copy_overlay() {
  if [ -d "$OVERLAY_DIR" ] && [ -n "$(ls -A "$OVERLAY_DIR")" ]; then
    echo "Copying overlay files from $OVERLAY_DIR:"
    (cd "$OVERLAY_DIR" && find . -type f)
    cp -R "$OVERLAY_DIR"/. "$APP_DIR"/
  fi
}

install_pods() {
  cd "$APP_DIR/ios"
  if [ -f ../Gemfile ]; then
    grep -q "^gem 'json'" ../Gemfile || echo "gem 'json', '< 3.0'" >> ../Gemfile
    (cd .. && bundle install)
    bundle exec pod install
  else
    pod install
  fi
  cd - > /dev/null
}

print_app_dir() {
  echo "app-root=$APP_DIR"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "app-root=$APP_DIR" >> "$GITHUB_OUTPUT"
  fi
}

fail() {
  echo "::error::$1"
  exit 1
}

main "$@"
