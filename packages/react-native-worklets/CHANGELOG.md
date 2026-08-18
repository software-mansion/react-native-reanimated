# Changelog

## Unpublished

<!-- Add a concise entry under the appropriate category. Include links to the pull request and author when available. -->

### 🛠 Breaking changes

### 🎉 New features

\[General] Per-runtime caching for RetainingSerializable

### 🐛 Bug fixes

- Fix a crash on Android when the React instance is recreated while animations are running - `AnimationFrameQueue` kept delivering frames after `WorkletsModule` was invalidated. ([#10278](https://github.com/software-mansion/react-native-reanimated/pull/10278) by [@shubhamdeol](https://github.com/shubhamdeol))
- Fix a data race between `getDirty` and `setBlocking` on a Synchronizable - the pointer holding the value is now read and written atomically. ([#10292](https://github.com/software-mansion/react-native-reanimated/pull/10292) by [@tjzel](https://github.com/tjzel))

### 💡 Others

\[general] - bump Worklets version to 0.13.0

- Split `Synchronizable` into an interface and a `SynchronizableDynamic` implementation. ([#10293](https://github.com/software-mansion/react-native-reanimated/pull/10293) by [@tjzel](https://github.com/tjzel))
