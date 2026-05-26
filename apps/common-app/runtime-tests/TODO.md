# Runtime-tests session TODOs

Captured during the session that built the iOS `DebugRuntimeTests` auto-run flow. Items are grouped by area, with file references where they live.

## Reanimated C++ workarounds (high priority)

These changes in [LayoutAnimationsProxy_Experimental.cpp](../../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp) make the experimental commit hook tolerate views that were mounted before the hook was installed. They unblock our auto-run flow, but they are workarounds — the underlying bug is in Reanimated itself:

- `pullTransaction` defensively creates a `LightNode` for an unknown `surfaceId`.
- `updateLightTree`'s `Update` case skips when the tag isn't in `lightNodes_`.
- `updateLightTree`'s `Insert` case bails out if the node, parent, or `mutation.index` is unusable.
- `updateLightTree`'s `Remove` case mirrors the same checks plus a bounds-check on `parent->children`.

Follow-ups:
- [ ] Decide whether to upstream these as the real fix, or replace with a "pre-populate `lightNodes_` from the current shadow tree at install time" approach.
- [ ] Audit the rest of the file for similar pre-existing-tag dereferences. Callsites to watch: `findTopScreen`, `handleSharedTransitionsStart`, `findSharedElementsOnScreen`, `hideTransitioningViews`, `cleanupAnimations`, `insertContainers`, `addOngoingAnimations`, `handleRemovals`, `handleProgressTransition`.
- [ ] Mirror the patch on the Android `#ifdef ANDROID` branch in `updateLightTree` (currently untouched).
- [ ] File a Reanimated issue describing the lazy-load scenario — any app that imports `react-native-reanimated` from a dynamic `require()` after the first React commit is exposed to this.

## Test framework error isolation

[apps/common-app/runtime-tests/ReJest/TestRunner/TestRunner.ts](ReJest/TestRunner/TestRunner.ts) and [apps/common-app/runtime-tests/ReJest/utils/remoteReporter.ts](ReJest/utils/remoteReporter.ts):

- [ ] `runTestCase`'s cleanup (`render(null)`, `unmockAnimationTimer`, `stopRecordingAnimationUpdates`) is outside the per-test try/catch. If any of those throw after a test failure, the whole run aborts.
- [ ] `runOnUISync` re-throws come back via `ErrorUtils.reportFatalError` instead of as a plain rejected promise. The soft global handler in `remoteReporter` catches them and keeps the run going, but those errors aren't attributed to the test that triggered them. Worth digging into `react-native-worklets` to see if there's a cleaner way to propagate worklet exceptions into the awaiting JS code.
- [ ] There are no per-test timeouts at the framework level — a hanging worklet would stall the run until the server-side `--idle-timeout` fires.

## Currently failing tests

From the latest full run (1,316 pass, 6 fail, 102s). All are real test-content issues, not infra:

- [ ] `createSerializable for unsupported types › throws when trying to serialize a Promise` — `expect(() => createSerializable(promise)).toThrow(...)` doesn't capture the worklet error path; the worklet bridge fast-paths through `ErrorUtils.reportFatalError` before the matcher can see it. Either fix the matcher to detect the global-handler path, or change the throw site to a synchronous JS throw.
- [ ] 5× `runLoop › executionOrder › scheduleOnRuntime, …, queueMicrotask/topLevel` — execution-order tests in [tests/runLoop/executionOrder.test.tsx](tests/runLoop/executionOrder.test.tsx). Not investigated yet.

## Test-runner infra

[apps/common-app/runtime-tests/](.) and [apps/fabric-example/scripts/runtime-tests-server.js](../../fabric-example/scripts/runtime-tests-server.js):

- [ ] `hello` reports `3 suites declared` even though [suites.ts](suites.ts) declares 14. Run still works because the suite list is correct on the device; only the `hello.suites` payload is short. Likely a serialization or array slicing bug in the runner's `declaredSuites = tests.map(...)` path — but unconfirmed.
- [ ] Two module-level `let renderLock = new RenderLock()` bindings exist (manual + auto runner). Works because only one runner mounts at a time, but is brittle. Centralize in [ReJest/utils/SyncUIRunner.ts](ReJest/utils/SyncUIRunner.ts) or expose via `configure()`.
- [ ] `TestSummaryLogger` writes ANSI escape codes unconditionally. Looks weird in CI/non-TTY contexts; add a plain-text fallback.
- [ ] `runtime-tests-server.js` aborts with `EADDRINUSE` if you accidentally start two runs. Either detect-and-fail with a friendly message or fall back to a free port.
- [ ] Metro's watchman recrawl warnings spam the server output. A one-shot `watchman watch-del && watch-project` would silence them; doing it inside the script feels invasive.
- [ ] Hardcoded simulator default is `iPhone 17`. If absent, fall back to the first available `iPhone *` rather than failing.
- [ ] Default suite list is fully baked into `RUNTIME_TEST_SUITES`; there's no way to disable suites from the CLI other than the inverse of `--only`. Add `--skip a,b` if needed.

## Reanimated isolation infrastructure (currently inactive)

Left in place so we can flip it back on quickly:

- [apps/common-app/runtime-tests/reanimated-shim.ts](reanimated-shim.ts) — stub that re-exports no-op versions of `makeMutable`, `useSharedValue`, `withTiming`, etc.
- [apps/fabric-example/metro.config.js](../../fabric-example/metro.config.js) — `runtimeTestsReanimatedShim` resolver is defined but commented out in the `resolver` block.

Follow-ups:
- [ ] Decide whether to keep the shim long-term (one-line toggle when we want to bisect new commit-hook regressions) or delete it once the upstream C++ fix lands.

## Direct `xcodebuild` / `metro` orchestration

User briefly asked, then reverted. Notes for next time:

- [ ] Direct Metro startup hangs on the initial graph scan in this monorepo for >60s. The previous attempt used `node node_modules/metro/src/cli.js serve --config metro.config.js`. Two issues to solve:
  - Metro's `exports` field doesn't expose `./src/cli`; resolve `metro/package.json` and join with the `bin` field.
  - The initial scan exceeds the server's connect timeout. Either bump the deadline or wait for an HTTP `/status` reply (the current probe).
- [ ] `xcodebuild` direct build needs the simulator UDID resolved via `xcrun simctl list devices --json <name>` and a `bootstatus` poll before install/launch.

## Debug residue

- [ ] Revert the temporary `console.log('????')` in [packages/react-native-reanimated/src/index.ts](../../../packages/react-native-reanimated/src/index.ts) (added during diagnosis of the eager reanimated import).

## Manual-flow regressions surfaced (not introduced)

These were `// TODO` comments already in the test source. They were preserved when test files were moved from `apps/common-app/src/apps/reanimated/examples/RuntimeTests/` to [apps/common-app/runtime-tests/](.):

- [ ] `withTiming` tests with the `tag is not passed to _updateProps` bug — `easing.test`, `transformMatrices.test`, layout/keyframe-based tests.
- [ ] Hanging suites — `withSpring/variousConfig`, `withDecay/basic`, `withSequence/callbackCascade`, `useDerivedValue/basic`.
- [ ] `StrictMode` support broken because of `findHostInstance_DEPRECATED`.
- [ ] Layout-animations suites disabled because `shadowNodeWrapper` isn't passed to `_notifyAboutProgress`.
- [ ] `core/onLayout` test — Android-only failure.

These are pre-existing and unrelated to this session, but they live in [suites.ts](suites.ts) now and are worth tracking somewhere.

## Out of scope this session (deliberate deferrals)

- Android target for the auto-run flow.
- CI workflow (GitHub Actions).
- Physical-device support — should work via `NativeModules.SourceCode.scriptURL` host detection but untested.
- A README/CLAUDE.md describing how to run the flow for new contributors.
