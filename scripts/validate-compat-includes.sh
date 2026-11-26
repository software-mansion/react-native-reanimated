#!/bin/bash

# Run from a package directory. React Native 0.87 and 0.88 have no umbrella headers, so every umbrella include needs a
# `__has_include` check, and the headers that `Compat/ReactNative*.h` wrap are allowed only there.
# `Common/NativeView` has its own checks: on Android it builds without the package include paths.

SOURCE_DIRS=(Common apple android/src)
INCLUDE='^[[:space:]]*#[[:space:]]*(include|import)[[:space:]]*[<"]'

main() {
  local compat_headers
  compat_headers=$(find Common/cpp -path '*/Compat/ReactNative*.h')
  if [ -z "$compat_headers" ]; then
    echo 'Found no `Common/cpp/*/Compat/ReactNative*.h` headers. Run this script from a package directory.'
    exit 1
  fi

  local status=0
  check_wrapped_headers "$compat_headers" || status=1
  check_umbrella_headers || status=1
  exit $status
}

check_wrapped_headers() {
  local wrapped_headers
  wrapped_headers=$(echo "$1" | xargs grep -hE "$INCLUDE" | sed -E 's/.*[<"]([^>"]+)[>"].*/\1/' |
    grep -E '^(React|react|ReactCommon|cxxreact)/' | sed 's/[.]/\\./g' | paste -sd '|' -)

  if source_files | xargs grep -nE "$INCLUDE($wrapped_headers)[>\"]" | grep -vE '/Compat/ReactNative|^Common/NativeView/'; then
    echo 'Found a direct include of a React Native header that a `Compat/ReactNative*.h` header wraps. Include that Compat header instead.'
    return 1
  fi
}

check_umbrella_headers() {
  if source_files | xargs awk -v include="$INCLUDE" '
      FNR == 1 { previous = "" }
      $0 ~ include "React/[A-Za-z]+\\.h[>\"]" && $0 !~ "React/RCT" {
        header = $0
        sub(/^[^<"]*[<"]/, "", header)
        sub(/[>"].*$/, "", header)
        if (previous !~ "__has_include\\([<\"]" header "[>\"]\\)") print FILENAME ":" FNR ":" $0
      }
      NF { previous = $0 }
    ' | grep .; then
    echo 'Found a React Native umbrella header include without a `#if __has_include(<React/...>)` check on the line before it.'
    return 1
  fi
}

source_files() {
  find "${SOURCE_DIRS[@]}" -type f \( -name '*.h' -o -name '*.hpp' -o -name '*.cpp' -o -name '*.m' -o -name '*.mm' \)
}

main
