# Changelog

## Unpublished

<!-- Add a concise entry under the appropriate category. Include links to the pull request and author when available. -->

### 🛠 Breaking changes

### 🎉 New features

### 🐛 Bug fixes

- Fix `AnimationFrameQueue` continuing to deliver frames after `WorkletsModule` is invalidated, which aborted the process with `JNI DETECTED ERROR IN APPLICATION: obj == null` on Android when the React instance was recreated while animations were running. ([#PR_NUMBER](https://github.com/software-mansion/react-native-reanimated/pull/PR_NUMBER) by [@shubhamdeol](https://github.com/shubhamdeol))

### 💡 Others

\[general] - bump Worklets version to 0.13.0
