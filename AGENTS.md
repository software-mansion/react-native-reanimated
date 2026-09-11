# Agent guide for the react-native-reanimated monorepo

Facts that are true on `main` and that agents otherwise re-discover in every session. Verify against the code when in doubt. Fix this file in the same PR that makes it stale.

## Tooling

- Yarn 4 workspaces, single root lockfile, exact versions only (`scripts/disallow-non-exact.js`). Use `yarn`, `yarn dlx`, `yarn workspace <name> <script>`. Never `npm`, `npx` or `pnpm`.
- Node from `.nvmrc`, Ruby from `.ruby-version`, CocoaPods through bundler: `bundle exec pod install`. CI rejects a `Podfile.lock` written by a different CocoaPods version.
- Husky refuses commits and pushes on `main`. Work on a branch.
- Formatters: oxfmt (JS/TS), remark (`yarn format:md`, CI fails on any diff), clang-format (C++/ObjC), cmake-format, spotless (Kotlin/Java). Prettier is not used.
- Use the existing scripts (root `scripts/`, per-package `scripts/`, `scripts` in each `package.json`). Do not invent ad-hoc build or test scripts.

## Layout

- `packages/react-native-reanimated` - animations library. Depends on worklets.
- `packages/react-native-worklets` - worklet runtimes, serialization, run loops. Nested workspaces: `plugin/` (Babel plugin, workspace `babel-plugin-worklets`) and `plugin-oxc/` (Rust/napi port, workspace `worklets-oxc-plugin`).
- `packages/eslint-plugin-reanimated` - internal lint rules used by both packages.
- `apps/common-app` - all example screens (`src/apps/{reanimated,worklets,css,macos,runtime-tests}`) and the on-device test suites (`runtime-tests/`, a sibling of `src/`). Not runnable on its own.
- `apps/fabric-example` - primary iOS/Android app and the runtime-tests host. No local `node_modules`, everything hoists to the root.
- `apps/macos-example`, `apps/tvos-example` - own `node_modules` (`hoistingLimits: workspaces`). macOS cannot run Bundle Mode, so its `build` script runs `toggle-bundle-mode --off`.
- `apps/web-example` (Expo web, Playwright), `apps/next-example` (Next.js, Cypress).
- `docs/docs-reanimated`, `docs/docs-worklets` - Docusaurus. Worklets docs are nested into the Reanimated build on publish.

Both packages share one internal layout:

- `src/` TS public API. Platform variants: `x.native.ts`, `x.ts` (web), `xCommon.ts`.
- `Common/cpp/<pkg>/` portable C++ used by iOS and Android.
- `apple/<pkg>/apple/` Objective-C++.
- `android/src/main/cpp/<pkg>/android/` fbjni glue, `android/src/main/java/com/swmansion/<pkg>/` Kotlin.
- `__tests__/` Jest, `__typetests__/` tstyche. `src/mock.ts` must mirror the exports of `src/index.ts` (`yarn validate-mock`).

Committed build artifacts, rebuild them and never hand-edit: `packages/react-native-worklets/plugin/index.js`, `plugin/index.d.ts`, `packages/eslint-plugin-reanimated/index.js`, `packages/eslint-plugin-reanimated/types/`. The pre-commit hook rebuilds and stages the worklets plugin.

## How the pieces link

- `node_modules/react-native-reanimated` and `node_modules/react-native-worklets` are symlinks to `packages/*`. Reanimated always compiles against in-repo worklets headers.
- Package entry points: `react-native` and `source` point at `src/index` (apps, Metro, Jest). `main`, `module` and `types` point at `lib/` (npm consumers, `type:check`, madge, tree-shake checks). A stale `lib/` breaks checks but never the app.
- Reanimated and worklets are pinned three times: exact `peerDependencies` version, `compatibility.json` (checked by `yarn validate-peers` and by Android `preBuild`), and a C++ `static_assert` of `WORKLETS_STABLE_API_VERSION` (`packages/react-native-worklets/Common/cpp/worklets/Compat/StableApi.h`) against `EXPECTED_WORKLETS_STABLE_API_VERSION` (`packages/react-native-reanimated/Common/cpp/reanimated/Compat/WorkletsApi.h`). Change one, change the other.
- Reanimated native code may include exactly one worklets header, `<worklets/Compat/StableApi.h>`. `packages/react-native-reanimated/scripts/validate-worklets-includes.sh` enforces this.
- `packages/react-native-reanimated/plugin` re-exports `react-native-worklets/plugin`.
- Static feature flags: `src/featureFlags/staticFlags.json` merged with the app's `package.json` field `reanimated.staticFeatureFlags` or `worklets.staticFeatureFlags`. iOS injects them through `scripts/*_utils.rb` into the podspec `OTHER_CFLAGS`, Android through `build.gradle.kts` into CMake arguments. The flags become compiler defines, so re-run `pod install` after changing them.
- The `@/` alias to `apps/common-app/src` is declared in `apps/common-app/tsconfig.native.json` and in `module-resolver` in `apps/fabric-example/babel.config.js`, `apps/macos-example/babel.config.js` and `apps/web-example/babel.config.js`. Keep them in sync.

## Where to look: worklets

- JS to C++ surface: not the TurboModule spec. `src/specs/NativeWorkletsModule.ts` has three methods. Everything else is `globalThis.__workletsModuleProxy`, installed in `JSIWorkletsModuleProxy::toOptimizedObject` and mirrored in `src/WorkletsModule/workletsModuleProxy.ts`, `NativeWorklets.native.ts` and `src/privateGlobals.d.ts`. Adding a native method needs no codegen change.
- Platform seam: `RuntimeBindings` (`Common/cpp/worklets/WorkletRuntime/RuntimeBindings.h`), a struct of `std::function`s built by each platform module. A complete example of core plus both backends is `requestAnimationFrame`: `Common/cpp/worklets/AnimationFrameQueue/`, `apple/worklets/apple/AnimationFrameQueue.mm`, Kotlin `runloop/AnimationFrameQueue.kt`.
- Runtimes: `RuntimeKind` 1 = React Native, 2 = UI, 3 = Worker (`src/runtimeKind.ts`). The UI runtime runs on the platform main thread (`AsyncQueueUI` over `UIScheduler`). Each worker runtime owns a thread (`Common/cpp/worklets/RunLoop/AsyncQueueImpl.cpp`). `runOnUISync` and `runOnRuntimeSync` run inline on the caller.
- Scheduling order: `scheduleOnUI` batches inside `queueMicrotask` (`src/threads.native.ts`). `runOnUISync`, `Synchronizable.getBlocking`/`setBlocking`, native `getViewProp` and worker-runtime writes bypass that batch. Most ordering bugs come from this.
- Serialization: `Common/cpp/worklets/SharedItems/` and `src/memory/`. `Serializable::undefined()` is a shared singleton.
- Runtime setup: `Common/cpp/worklets/NativeModules/WorkletsModuleProxy.cpp` creates the runtimes, decorators in `Common/cpp/worklets/WorkletRuntime/` install the globals.
- Bundle Mode: Babel plugin option `bundleMode`, Metro helper `react-native-worklets/bundleMode`, Metro patches in `packages/react-native-worklets/bundleMode/patches/` (not published). `fabric-example` runs Bundle Mode by default. `yarn toggle-bundle-mode` (repo root) patches tracked files in `apps/` and `package.json`, so it pollutes the diff. Generated chunks live in `packages/react-native-worklets/.worklets/`. Keep `.worklets/dummy.md`.

## Where to look: reanimated

- JS to C++ surface: same pattern as worklets. `src/specs/NativeReanimatedModule.ts` has one method, `installTurboModule`. The real API is `globalThis.__reanimatedModuleProxy`, installed in `ReanimatedModuleProxy::toOptimizedObject` (`Common/cpp/reanimated/NativeModules/`) and typed in `src/ReanimatedModule/reanimatedModuleProxy.ts`. `src/ReanimatedModule/NativeReanimated.ts` wraps it on native, `js-reanimated/JSReanimated.ts` is the web implementation.
- Platform seam: `Common/cpp/reanimated/Tools/PlatformDepMethodsHolder.h`, filled by `apple/reanimated/apple/ReanimatedModule.mm` and `android/src/main/cpp/reanimated/android/NativeProxy.cpp`. Frame ticks and event dispatch come from `REANodesManager.mm` (CADisplayLink) and `NodesManager.kt` (ReactChoreographer).
- UI runtime globals used by JS worklets (`_updateProps`, `_measure`, `_dispatchCommand`, `_obtainProp`, `_notifyAboutProgress`, `_setGestureState` and others) are installed in `Common/cpp/reanimated/RuntimeDecorators/UIRuntimeDecorator.cpp`. The React Native runtime side is `RNRuntimeDecorator.cpp`.
- Style update path: `useAnimatedStyle` and `useAnimatedProps` (`src/hook/`) write through `src/updateProps/updateProps.native.ts`, which calls `_updateProps` on the UI runtime. Native stores the values in `Fabric/updates/AnimatedPropsRegistry` and `UpdatesRegistryManager`, and `Fabric/ReanimatedCommitHook` applies them to the shadow tree with `cloneShadowTreeWithNewProps` (`Fabric/ShadowTreeCloner`) on every commit. `Fabric/ReanimatedMountHook` runs after mount.
- Animated components: `src/createAnimatedComponent/` (`AnimatedComponent.native.tsx`, `JSPropsUpdater`, `InlinePropManager`, `NativeEventsManager`, `PropsFilter`). Shared values live in `src/mutables.native.ts` and `src/mutablesCommon.ts`.
- Events: `src/WorkletEventHandler.native.ts` registers through `registerEventHandler`, native side in `Common/cpp/reanimated/Events/UIEventHandlerRegistry`.
- Layout animations: JS in `src/layoutReanimation/` and `src/UpdateLayoutAnimations.native.ts` (`configureLayoutAnimationBatch`). Native in `Common/cpp/reanimated/LayoutAnimations/`: `LayoutAnimationsManager` holds configs, `LayoutAnimationsProxy` (default) and `LayoutAnimationsProxy_Legacy` (`USE_LEGACY_LAYOUT_ANIMATIONS_PROXY`) are `MountingOverrideDelegate`s chosen at install time through `LayoutAnimationsProxyRegistry`. Shared element transitions are in `SharedTransitions.cpp` and the `REASharedTransitionBoundary` Fabric component in `Common/NativeView/`.
- CSS animations and transitions: JS in `src/css/` (`platform.native.ts` picks `css/native`, `platform.ts` picks `css/web`). Native in `Common/cpp/reanimated/CSS/` with `registries/` (keyframes, animations, transitions), `core/`, `interpolation/`, `easing/`, driven by `Fabric/updates/OperationsLoop`. Platform pieces in `apple/reanimated/apple/CSS` and `android/src/main/cpp/reanimated/android/CSS`.
- Other native features: `AnimatedSensor/`, `PseudoStyles/`, keyboard in `apple/reanimated/apple/keyboardObserver` and `android/src/main/java/com/swmansion/reanimated/keyboard`.

## Commands

```sh
yarn                                   # install (needed in every new worktree)
yarn build-packages                    # builds worklets then reanimated (bob), rebuilds the Babel plugin, fills lib/
yarn workspace react-native-worklets build
yarn workspace <pkg> type:check        # native + web + common-app + type tests
yarn workspace <pkg> lint              # lint:js + lint:android + lint:apple + lint:clang-tidy (+ lint:plugin)
yarn workspace <pkg> test              # Jest (root binary); `yarn workspace <pkg> jest <pattern>` for one file
yarn workspace <pkg> format
yarn lint && yarn format && yarn format:md   # repo-wide
yarn test:scripts                      # tests for root scripts/
yarn build-apps                        # regenerates apps/*/ios/Podfile.lock; macos-example may fail, that is known
```

iOS (`apps/fabric-example/ios`): workspace `FabricExample.xcworkspace`, schemes `Debug FabricExample` and `Release FabricExample`, configurations `DebugRuntimeTests` and `ReleaseRuntimeTests`. Pod-only schemes `RNWorklets` and `RNReanimated` compile native code without the app. `RCT_USE_PREBUILT_RNCORE=0 RCT_USE_RN_DEP=0` builds React Native from source (needed for sanitizers). Re-run `pod install` after switching branches when native files were added or removed, because the podspecs glob sources.

Android: `yarn workspace fabric-example android` (`--active-arch-only`). Worklets/Reanimated cannot be built without an app project and the React Native Gradle Plugin. Gradle does not track worklets package files for `createBundleReleaseJsAndAssets`, so pass `--rerun` after editing JS.

Fast C++ syntax check without a native build. Run from `packages/react-native-worklets` after `pod install` in fabric-example:

```sh
RN=../../node_modules/react-native
HERMES=../../apps/fabric-example/ios/Pods/hermes-engine/destroot/include
clang++ -std=c++20 -fsyntax-only -I Common/cpp -I $RN/ReactCommon/jsi -I $RN/ReactCommon \
  -I $RN/ReactCommon/callinvoker -I $RN/ReactCommon/react/nativemodule/core -I $HERMES <file.cpp>
```

`compile_commands.json` (for clangd and `lint:clang-tidy`) exists only after a real build. clangd errors in a fresh checkout are include-path noise.

## Tests

- Jest: per-package configs. Reanimated has the projects `native`, `ios`, `android` and `web`. `packages/react-native-reanimated/jest/resolver.js` forces web variants for the modules listed in `WEB_ONLY_IN_JEST` (`useAnimatedStyle`, `mutables` and others), so a green `native` project does not prove that a `.native.ts` file ran.
- Type tests: `__typetests__/*.tst.ts` through `scripts/test-ts.sh` (tstyche).
- Runtime tests (ReJest, on device): suites in `apps/common-app/runtime-tests/{reanimated,worklets,self-tests}`, harness in `apps/common-app/runtime-tests/ReJest`, entry points `apps/fabric-example/index.runtimeTests.*.js`. Driver:

```sh
yarn workspace fabric-example runtime-tests --library worklets --platform ios --udid <udid>
```

- `--library` takes `reanimated`, `worklets` or `self-tests`. `--platform` takes `ios` or `android`, with the device given by `--udid`, `--serial` or `--avd`. `--configuration` takes `DebugRuntimeTests` or `ReleaseRuntimeTests`. Other flags: `--only suiteA,suiteB`, `--skip-build`, `--metro-port N`, `--port N`.
- The reporting port defaults to the Metro port plus one (8082 for Release, which embeds the bundle and runs no Metro). `--skip-build` installs whatever is already built for that configuration. `--help` lists everything. Approximate durations: self-tests under a minute, worklets about 1 minute, reanimated about 2 minutes.
- ReJest semantics: `mockAnimationTimer()` advances 16 ms per real frame, `wait()` is real time, `waitForNotification` is the idiom for "animation finished", `toThrow` matches substrings, `toMatchNativeSnapshots` compares against pixel-grid-rounded native metrics with a 0.5 dp tolerance. Suites are `__DEV__`-gated inconsistently, so a `__DEV__`-only assertion can fail only in the Release nightly. Android emulators need GPU acceleration (`hw.gpu.mode=host`) or mocked-clock tests time out.
- CI: `*-static-checks.yml`, `runtime-tests-{ios,android,nightly,sanitizers-nightly}.yml`, `{android,apple}-validation.yml`, `changelog-check.yml`, `yarn-validation.yml`, example build checks, docs build and publish, `npm-*-publish*.yml`.

## Cross-cutting change checklist

- New native binding: `Common/cpp`, then `android/src/main/cpp`, Kotlin (if exposed), `apple/`, then `src/` TS (`workletsModuleProxy.ts`, `privateGlobals.d.ts`, `mock.ts`).
- Worklets public API change: grep `packages/react-native-reanimated/src`, the largest consumer.
- Babel plugin change: run `plugin/__tests__`, rebuild `plugin/index.js`, rebuild both packages.
- Any package change needs a `CHANGELOG.md` entry under `## Unpublished`: `- Description. ([#N](pr-url) by [@user](profile-url))`. `changelog-check` is always red on `*-stable` branches. Ignore it there.
- Docs-visible API change: update `docs/docs-reanimated` and/or `docs/docs-worklets`.
- Do not commit changes to the playground files `apps/common-app/src/apps/reanimated/examples/EmptyExample.tsx` and `apps/common-app/src/apps/css/examples/animations/screens/testExamples/Playground.tsx`.
- PR template: `.github/PULL_REQUEST_TEMPLATE.md` (Summary, Test plan).

## Fresh checkout or worktree

1. `yarn` - a new worktree has no `node_modules`.
1. `yarn build-packages` - fills `lib/` and rebuilds the plugin. `type:check` and `circular-dependency-check` fail without it.
1. After merging across a version bump: `rm packages/react-native-worklets/.worklets/*.js` (keep `dummy.md`) and `yarn jest --clearCache`. Stale chunks trip the plugin version check.
1. `cd apps/fabric-example/ios && bundle exec pod install` when native files changed.
1. Metro `--reset-cache` after toggling Bundle Mode.

## Release facts

- The release procedure lives in `packages/react-native-reanimated/RELEASE.md`. Worklets follows the same flow from `worklets-<X.Y>-stable` branches, and its version file is `src/debug/jsVersion.ts`.
- When the worklets stable API changes, bump `WORKLETS_STABLE_API_VERSION` in `StableApi.h` and `EXPECTED_WORKLETS_STABLE_API_VERSION` in `WorkletsApi.h` together, also on backports.
