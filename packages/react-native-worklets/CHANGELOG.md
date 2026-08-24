# Changelog

## Unpublished

<!-- Add a concise entry under the appropriate category. Include links to the pull request and author when available. -->

### 🛠 Breaking changes

- Change the C++ `Synchronizable` interface to operate on `std::variant` values. Getters return a `Serializable`, a `double` or a `bool`, and `setBlocking` takes either a `Serializable` or a plain value. ([#10294](https://github.com/software-mansion/react-native-reanimated/pull/10294) by [@tjzel](https://github.com/tjzel))
- Add virtual `setDirty` to the C++ `Synchronizable` interface. `SynchronizableDynamic` throws from it. ([#10295](https://github.com/software-mansion/react-native-reanimated/pull/10295) by [@tjzel](https://github.com/tjzel))

### 🎉 New features

\[General] Per-runtime caching for RetainingSerializable

- Add `isOnUIThread` to the Worklets Stable API.
- Add the fast-path `fixedType` option to `createSynchronizable`. A fixed-type Synchronizable holds a number or a boolean without serialization and exposes `setDirty`, a non-exclusive write that doesn't wait for other `setDirty` calls. ([#10296](https://github.com/software-mansion/react-native-reanimated/pull/10296) by [@tjzel](https://github.com/tjzel))

### 🐛 Bug fixes

- Fix a crash on Android when the React instance is recreated while animations are running - `AnimationFrameQueue` kept delivering frames after `WorkletsModule` was invalidated. ([#10278](https://github.com/software-mansion/react-native-reanimated/pull/10278) by [@shubhamdeol](https://github.com/shubhamdeol))
- Fix a data race between `getDirty` and `setBlocking` on a Synchronizable - the pointer holding the value is now read and written atomically. ([#10292](https://github.com/software-mansion/react-native-reanimated/pull/10292) by [@tjzel](https://github.com/tjzel))
- Fix `setBlocking` leaving a Synchronizable locked forever in development builds when the updater function or the serializer throws. ([#10331](https://github.com/software-mansion/react-native-reanimated/pull/10331) by [@tjzel](https://github.com/tjzel))
- Compare the Synchronizable's imperative lock owner with `std::thread::id` instead of comparing `pthread_t` with `==`, which POSIX doesn't define. ([#10349](https://github.com/software-mansion/react-native-reanimated/pull/10349) by [@tjzel](https://github.com/tjzel))
- Added an umbrella header for removed `Serializable.h` file for backwards compatibility with Expo

### 💡 Others

- Update the sponsors section in the README. ([#10347](https://github.com/software-mansion/react-native-reanimated/pull/10347) by [@m-bert](https://github.com/m-bert))
- bump Worklets version to 0.13.0
- Split every C++ `Serializable` subclass into a dedicated file under `SharedItems/Serializable/`, with its factory function alongside. No behavior change. ([#10345](https://github.com/software-mansion/react-native-reanimated/pull/10345) by [@tjzel](https://github.com/tjzel))
- Split `Synchronizable` into an interface and a `SynchronizableDynamic` implementation. ([#10293](https://github.com/software-mansion/react-native-reanimated/pull/10293) by [@tjzel](https://github.com/tjzel))
- Remove outdated Worklets Babel plugin README. ([#10350](https://github.com/software-mansion/react-native-reanimated/pull/10350) by [@tjzel](https://github.com/tjzel))
