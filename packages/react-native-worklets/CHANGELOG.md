# Changelog

## Unpublished

<!-- Add a concise entry under the appropriate category. Include links to the pull request and author when available. -->

### 🛠 Breaking changes

- Removed the networking preview together with its `FETCH_PREVIEW_ENABLED` feature flag. ([#10250](https://github.com/software-mansion/react-native-reanimated/pull/10250) by [@tjzel](https://github.com/tjzel))
- Remove the Serializable handle - `SerializableInitializer`, `createSerializableInitializer` and the `__init` clone path are gone. `Serializable::ValueType::HandleType` stays in the Compat Stable API enum for ABI compatibility and `extractSerializable` throws for it. ([#10414](https://github.com/software-mansion/react-native-reanimated/pull/10414) by [@tjzel](https://github.com/tjzel))
- `makeShareable` now serializes its value eagerly into a retaining Serializable instead of rebuilding it lazily on each runtime through a handle. ([#10412](https://github.com/software-mansion/react-native-reanimated/pull/10412) by [@tjzel](https://github.com/tjzel))
- Remove worklet context objects from the Babel plugin. ([#10411](https://github.com/software-mansion/react-native-reanimated/pull/10411) by [@tjzel](https://github.com/tjzel))
- Change the C++ `Synchronizable` interface to operate on `std::variant` values. Getters return a `Serializable`, a `double` or a `bool`, and `setBlocking` takes either a `Serializable` or a plain value. ([#10294](https://github.com/software-mansion/react-native-reanimated/pull/10294) by [@tjzel](https://github.com/tjzel))
- Add virtual `setDirty` to the C++ `Synchronizable` interface. `SynchronizableDynamic` throws from it. ([#10295](https://github.com/software-mansion/react-native-reanimated/pull/10295) by [@tjzel](https://github.com/tjzel))

### 🎉 New features

- Add iOS Swift Package Manager support via `Package.swift` and SPM integration metadata in `react-native.config.js`. ([#10472](https://github.com/software-mansion/react-native-reanimated/pull/10472) by [@kacperzolkiewski](https://github.com/kacperzolkiewski))
- Add a standalone networking module for Worklet Runtimes in Bundle Mode, with `XMLHttpRequest` for text and `arraybuffer` responses. ([#10493](https://github.com/software-mansion/react-native-reanimated/pull/10493) by [@tjzel](https://github.com/tjzel))
- Add `Blob` and `FileReader` to the Worklets networking module, and `blob` and `arraybuffer` response types to `XMLHttpRequest`. ([#10494](https://github.com/software-mansion/react-native-reanimated/pull/10494) by [@tjzel](https://github.com/tjzel))
- Add `fetch`, `Headers`, `Request` and `Response` to the Worklets networking module, backed by `whatwg-fetch`. ([#10495](https://github.com/software-mansion/react-native-reanimated/pull/10495) by [@tjzel](https://github.com/tjzel))
- Add `FormData` to the Worklets networking module, with multipart encoding done in JavaScript. ([#10496](https://github.com/software-mansion/react-native-reanimated/pull/10496) by [@tjzel](https://github.com/tjzel))
- Add `AbortController` and `AbortSignal` to the Worklets networking module. ([#10497](https://github.com/software-mansion/react-native-reanimated/pull/10497) by [@tjzel](https://github.com/tjzel))
- Add the `enableNetworking` option to `createWorkletRuntime`. It defaults to `true` and is forced off on runtimes without the Event Loop. ([#10498](https://github.com/software-mansion/react-native-reanimated/pull/10498) by [@tjzel](https://github.com/tjzel))

\[General] Per-runtime caching for RetainingSerializable

- Add `isOnUIThread` to the Worklets Stable API.
- Add the fast-path `fixedType` option to `createSynchronizable`. A fixed-type Synchronizable holds a number or a boolean without serialization and exposes `setDirty`, a non-exclusive write that doesn't wait for other `setDirty` calls. ([#10296](https://github.com/software-mansion/react-native-reanimated/pull/10296) by [@tjzel](https://github.com/tjzel))
- The Babel plugin treats `navigator` as a known global: worklets resolve it on their own runtime instead of capturing the main runtime's object by closure. ([#10364](https://github.com/software-mansion/react-native-reanimated/pull/10364) by [@wcandillon](https://github.com/wcandillon))
- Add an OXC port of the Babel plugin for Bundle Mode. ([#9518](https://github.com/software-mansion/react-native-reanimated/pull/9518) by [@tshmieldev](https://github.com/tshmieldev))
- Add `getCurrentThreadId` as public JavaScript API.
- Autoworkletize the fourth argument of `withTiming` and `withSpring`. ([#10467](https://github.com/software-mansion/react-native-reanimated/pull/10467) by [@piaskowyk](https://github.com/piaskowyk))

### 🐛 Bug fixes

- Fix a crash on Android when the React instance is recreated while animations are running - `AnimationFrameQueue` kept delivering frames after `WorkletsModule` was invalidated. ([#10278](https://github.com/software-mansion/react-native-reanimated/pull/10278) by [@shubhamdeol](https://github.com/shubhamdeol))
- Stop `AnimationFrameQueue` from dispatching the rest of a frame batch when `WorkletsModule` is invalidated from inside a frame callback. ([#10464](https://github.com/software-mansion/react-native-reanimated/pull/10464) by [@tjzel](https://github.com/tjzel))
- Fix a data race between `getDirty` and `setBlocking` on a Synchronizable - the pointer holding the value is now read and written atomically. ([#10292](https://github.com/software-mansion/react-native-reanimated/pull/10292) by [@tjzel](https://github.com/tjzel))
- Fix `setBlocking` leaving a Synchronizable locked forever in development builds when the updater function or the serializer throws. ([#10331](https://github.com/software-mansion/react-native-reanimated/pull/10331) by [@tjzel](https://github.com/tjzel))
- Compare the Synchronizable's imperative lock owner with `std::thread::id` instead of comparing `pthread_t` with `==`, which POSIX doesn't define. ([#10349](https://github.com/software-mansion/react-native-reanimated/pull/10349) by [@tjzel](https://github.com/tjzel))
- Added an umbrella header for removed `Serializable.h` file for backwards compatibility with Expo
- Fix the umbrella `Serializable.h` header including a non-existent `RetainableSerializable.h` instead of `RetainingSerializable.h`, which made the header fail to compile. ([#10406](https://github.com/software-mansion/react-native-reanimated/pull/10406) by [@tjzel](https://github.com/tjzel))
- Fix build error when Bundle Mode worklet captures JSX name. ([#10409](https://github.com/software-mansion/react-native-reanimated/pull/10409) by [@tshmieldev](https://github.com/tshmieldev))
- Fix `ReferenceError` when a worklet file assigns to `module.exports`. ([#10408](https://github.com/software-mansion/react-native-reanimated/pull/10408) by [@tshmieldev](https://github.com/tshmieldev))
- Stop workletizing getters, setters and constructors. ([#10421](https://github.com/software-mansion/react-native-reanimated/pull/10421) by [@tshmieldev](https://github.com/tshmieldev))
- Fix a crash when serializing objects with a `__proto__` key. ([#10451](https://github.com/software-mansion/react-native-reanimated/pull/10451) by [@tshmieldev](https://github.com/tshmieldev))
- Fix `./gradlew app:build` failing on `:lintAnalyzeDebug` with a K2 UAST crash on `.gradle.kts` build scripts - all lint tasks are now skipped, not only `lintVital*`. ([#10448](https://github.com/software-mansion/react-native-reanimated/pull/10448) by [@tshmieldev](https://github.com/tshmieldev))

### 💡 Others

- Build `nativeLoggingHook` for Worklet Runtimes natively instead of reading React Native's host function from the RN Runtime. ([#10488](https://github.com/software-mansion/react-native-reanimated/pull/10488) by [@tjzel](https://github.com/tjzel))
- Drop the `RCTEventEmitter` base class from `WorkletsModule` on iOS. The module never emitted events, so it now inherits from `NSObject` and declares the `bridge` property itself. ([#10485](https://github.com/software-mansion/react-native-reanimated/pull/10485) by [@tjzel](https://github.com/tjzel))
- Pass arguments to batched UI worklets separately instead of capturing them in wrapper worklets, reducing worklet serialization. ([#10466](https://github.com/software-mansion/react-native-reanimated/pull/10466) by [@tshmieldev](https://github.com/tshmieldev))
- Mark the special-case `__proto__` object reconstruction path as unlikely. ([#10465](https://github.com/software-mansion/react-native-reanimated/pull/10465) by [@tshmieldev](https://github.com/tshmieldev))
- Update the sponsors section in the README. ([#10347](https://github.com/software-mansion/react-native-reanimated/pull/10347) by [@m-bert](https://github.com/m-bert))
- bump Worklets version to 0.13.0
- Split every C++ `Serializable` subclass into a dedicated file under `SharedItems/Serializable/`, with its factory function alongside. No behavior change. ([#10345](https://github.com/software-mansion/react-native-reanimated/pull/10345) by [@tjzel](https://github.com/tjzel))
- Split `Synchronizable` into an interface and a `SynchronizableDynamic` implementation. ([#10293](https://github.com/software-mansion/react-native-reanimated/pull/10293) by [@tjzel](https://github.com/tjzel))
- Remove outdated Worklets Babel plugin README. ([#10350](https://github.com/software-mansion/react-native-reanimated/pull/10350) by [@tjzel](https://github.com/tjzel))
- Document the `fixedType` option and `setDirty` for Synchronizable. ([#10297](https://github.com/software-mansion/react-native-reanimated/pull/10297) by [@tjzel](https://github.com/tjzel))
- Use the built-in Hermes microtask queue on Worklet Runtimes instead of a custom JS implementation. `queueMicrotask` now enqueues native Hermes jobs, the private `__callMicrotasks` global is replaced by `__drainMicrotasks`, and the `_microtaskQueueFinalizers` array is removed. ([#10199](https://github.com/software-mansion/react-native-reanimated/pull/10199) by [@tjzel](https://github.com/tjzel))
- Drain the microtask queue after each `requestAnimationFrame` callback on the UI Runtime, instead of once after the whole batch. ([#10237](https://github.com/software-mansion/react-native-reanimated/pull/10237) by [@tjzel](https://github.com/tjzel))
- Renumber worklet hashes in plugin snapshots so they survive unrelated changes. ([#10420](https://github.com/software-mansion/react-native-reanimated/pull/10420) by [@tshmieldev](https://github.com/tshmieldev))
