**THIS DOCUMENT IS AI GENERATED**

# clangd metadata pipeline

Keeps `compile_commands.json` in both packages up to date for clangd and
clang-tidy, automatically, after every build — iOS or Android, in either
order.

## Required tools

Install once per machine:

```bash
brew install xcode-build-server   # parses Xcode's xcactivitylog into a DB
brew install llvm                  # gives you clangd + clang-tidy (LLVM 22+)
```

Apple's Xcode toolchain ships `clangd` but **not** `clang-tidy`. The Android
NDK ships both; the gradle hook auto-picks them.

## The scripts (all in [scripts/](.))

| File | Role |
|---|---|
| `clangd-add-xcode-step.rb` | `require_relative`'d from each Podfile; injects the iOS build phase. |
| `clangd-generate-xcode-metadata.sh` | The iOS build phase. Waits for the xcactivitylog to stabilize, runs xcode-build-server, then publishes. |
| `clangd-android-hook.gradle.kts` | Applied from each package's `android/build.gradle.kts`; same publish step, but from gradle. |
| `clangd-publish.js` | Single CLI that loads any number of `.compile`/`compile_commands.json` inputs, normalizes them (drops Apple-only flags + Swift-only entries), merges by `file` (freshest mtime wins), and writes the output. |
| `clang-tidy-lint.sh` | Wraps `run-clang-tidy`; auto-picks toolchain based on the DB's compiler. |

## Flow

### iOS build (Xcode → build phase)

1\. The phase backgrounds itself and polls the project's DerivedData `Logs/Build/` until the latest `.xcactivitylog` stops growing.
1\. xcode-build-server parses that log into `.compile`.
1\. `clangd-publish.js` is called once per package with `.compile` + that package's `android/.cxx/` tree as inputs.
1\. Per-package `compile_commands.json` files are rewritten.

### Android build (gradle → `ExternalNativeBuildJsonTask` `doLast`)

1\. CMake generates `compile_commands.json` shards under `android/.cxx/<config>/<hash>/<arch>/`.
1\. The post-build hook calls `clangd-publish.js` with the iOS `.compile` (if present) + this package's `.cxx` tree.
1\. Same package-level output file is rewritten.

### Why "merge" instead of "copy"

Per-file freshest-wins. A file that exists in both DBs gets the entry from
whichever side compiled more recently; an iOS-only `.mm` keeps iOS flags; an
Android-only `.cpp` keeps NDK flags. Bouncing between platforms is no longer
destructive.

## Wiring

\- **iOS**: each Podfile (`apps/*/{ios,macos}/Podfile`) `require_relative`s
`clangd-add-xcode-step.rb` and calls `add_clangd_generation_step()` inside
its main target. Run `pod install` to add/refresh the phase.
\- **Android**: `packages/*/android/build.gradle.kts` already attaches the hook
to `ExternalNativeBuildJsonTask`. Only runs when `IS_REANIMATED_EXAMPLE_APP=1`.

## VSCode setup

```jsonc
// .vscode/settings.json (or user settings)
{
  "clangd.path": "/opt/homebrew/opt/llvm/bin/clangd"
}
```

A single recent LLVM clangd handles both iOS- and Android-flagged entries —
no per-platform wrapper needed.

## Linting

```bash
cd packages/react-native-{reanimated,worklets}
yarn lint:clang-tidy
```

`clang-tidy-lint.sh` inspects `compile_commands.json` and picks the matching
`clang-tidy`: NDK's binary if the DB came from Android, the LLVM toolchain on
PATH otherwise. `info: using <path>` on the first line tells you which.

## Troubleshooting

\- **clangd shows old errors** → restart language server (Cmd+Shift+P →
"clangd: Restart language server"); clangd caches the DB per file.
\- **"argument unused" / "unknown argument" in clang-tidy** → add the flag to
`DROP_FLAGS_WITH_VALUE` in `clangd-publish.js`.
\- **"PCH uses an older format"** → toolchain mismatch; the auto-pick in
`clang-tidy-lint.sh` should already be using the matching binary.
\- **`xcode-build-server config` fails with exit 65** → wrong `-scheme` name;
list options with `xcodebuild -list`.
