---
id: migration-from-3.x
title: Migrating from Reanimated 3.x to 4.x
sidebar_label: Migration from 3.x
---

:::note
Reanimated 4.x is currently in beta period and there hasn't been a stable release yet. Migration steps are yet to be confirmed.
:::

### New Architecture only

Reanimated 4.x supports only the [New React Native architecture](https://reactnative.dev/architecture/landing-page) and drops support for the old architecture along with the legacy renderer (commonly known as Paper) entirely. If your app still runs on the old architecture, please consider adopting the New Architecture or stay with latest 3.x release.

### Changes in public API

On the API surface level, Reanimated 4.x doesn't introduce any breaking changes between 3.x and 4.x. All the code you've written in Reanimated v2 or v3 API works in 4.x without any changes. Animations based on shared values will work the same way as before, simultaneously and interchangeably with CSS animations and transitions. This means you can adopt CSS animations and transitions in your codebase incrementally at your own pace.

### Integration with other libraries

All integrations with other third-party libraries such as [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/docs/) or [React Native Skia](https://shopify.github.io/react-native-skia/) work the same as on 3.x.

### Migrating from 2.x

For the migration guide between 2.x and 3.x versions please consult [Migration from 2.x to 3.x](/docs/guides/migration-from-2.x.md).
