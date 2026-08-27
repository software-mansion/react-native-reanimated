# Reproducible local environment

The Nix environment builds the host harness on Linux or macOS without an Android SDK, NDK, Xcode, CocoaPods, Gradle, or Homebrew. It fetches pinned React Native, Hermes, Folly, and fbjni sources and builds native executables for the current machine.

Install Nix once, then run commands from the repository root:

```sh
harness/nix/run test
harness/nix/run dashboard
harness/nix/run mutation
harness/nix/run check
```

`test` and `dashboard` keep an incremental CMake build under `build/` and use ccache. `check` performs the clean build suitable for CI. The first command builds Hermes and ReactCommon and can take several minutes; Nix keeps those outputs in the local store, so later runs reuse them. No build output or binary cache is stored in the repository.

`harness/nix/run` stages only the files used by the harness before invoking the flake. This keeps the command fast in a pure jj workspace, where Nix would otherwise hash ignored files such as `node_modules` and existing build directories.

## React Native versions

The default version comes from `devDependencies.react-native` in the root `package.json`. A missing version record stops evaluation with the command needed to add it.

When updating the example apps:

1. update React Native in the repository as usual;
2. run `harness/nix/run record-react-native`;
3. commit the updated `harness/nix/react-native-versions.json` with the dependency update;
4. run `harness/nix/run test`.

The recorder reads React Native's own Hermes, Folly, and fbjni pins and stores their Nix hashes. It can also prepare a version before changing the root dependency:

```sh
harness/nix/run record-react-native 0.88.0
```

Recorded versions are exposed as `layout-animation-harness-rn-0_87_0` packages. The `nightly` list in `react-native-versions.json` selects the opt-in matrix:

```sh
harness/nix/run matrix
```

Normal `test` and `check` runs build only the root-selected React Native version. Adding a historical version therefore does not slow down every local or CI run.

## Platform boundary

Both binaries are ordinary host processes. The Android target compiles the Android React Native props ABI and Reanimated's `ANDROID` path. The iOS target models the iOS pull and reentrant mounting rules through the harness driver.

The harness defines the build macro `ANDROID`, never the compiler macro `__ANDROID__`, and never touches `__APPLE__`, which follows the host compiler. Folly, Hermes, and libc++ key only on the compiler macros, so they always build for the real host; React Native and Reanimated key mostly on `ANDROID`, which is what makes the host build possible. Per host and variant this means:

| | Android binary | iOS binary |
| --- | --- | --- |
| Linux | faithful Android preprocessing | cxx host: `__APPLE__` code absent |
| macOS | hybrid: `ANDROID` plus `__APPLE__` | faithful iOS preprocessing |

Linux is authoritative for the Android variant and macOS for the iOS variant; the other two cells are extra coverage, not ground truth.

On Linux, compiler-defined Apple-only code is intentionally absent. In particular, the temporary RNScreens snapshot callback guarded by `__APPLE__` is not covered there. Boundary-based shared transitions, including boundaries used without RNScreens, use the same Reanimated implementation on Linux and macOS. Run an Apple host check when changing the RNScreens-specific snapshot path.

On macOS, the Android binary also compiles that `__APPLE__`-guarded snapshot callback — a combination no real device has. The harness installs a no-op snapshot function whenever `__APPLE__` is defined, so the hybrid runs correctly, but Android-specific conclusions should come from a Linux run.

Because `__ANDROID__` is never defined, `ShadowTree::isPropsUpdatesAccumulationGuaranteed` in React Native returns true unconditionally in both binaries. Both Android binaries therefore model `enableAccumulatedUpdatesInRawPropsAndroid = true`; the per-commit update storage branch that today's default-flag Android devices execute inside `ShadowTree` is not exercised here. The driver's push and pull modes still cover both orchestration models above the shadow tree. Do not work around this with `-D__ANDROID__` — it would flip Folly's and libc++'s platform detection; the gate would need to read the feature flag on all platforms upstream instead.
