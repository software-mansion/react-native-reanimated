---
id: migration
title: Migrating from Reanimated 1.x
sidebar_label: Migration from v1
---

We wanted to make it possible to migrate from Reanimated 1 to Reanimated 2 incrementally.
When installing Reanimated 2, you will be able to use the old API as well as the new one.
We made the latest stable Reanimated 1 available from the same package with a few exceptions, as we needed to address some naming collisions.
Whenever there was a naming collision with Reanimated 1, we'd rename the Reanimated 1 version of such method in order to keep the naming in Reanimated 2 cleaner.
This strategy made the most sense to us, as we are planning to slowly phase out the old API (we will keep making fixes to Reanimated 1 core but most likely stop new feature development).
Unfortunately, it means that Reanimated 2 introduces some breaking changes to the API, where some methods pulled from Reanimated 1 changed there name.
Thankfully the list of the renamed methods is relatively short, and the renamed methods weren't too frequently used anyways.

### Renamed methods:

#### 1. `interpolate` renamed to `interpolateNode`

When using `interpolate` imported directly from `react-native-reanimated` v1, in v2 you should use `interpolateNode` instead.
If you were using a class member method `AnimatedValue.interpolate`, no change is necessary.

#### 2. `Easing` renamed to `EasingNode`

When using `Easing` imported from `react-native-reanimated` v1, in v2 you should use `EasingNode` instead.
