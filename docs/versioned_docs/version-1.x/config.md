---
id: config
title: Additional configuration
sidebar_label: Additional configuration
---

Reanimated exports two functions that control which properties can be animated natively:

1. `addWhitelistedNativeProps()` is used to animate properties that triggers layout recalculation, you can find them [here](https://github.com/software-mansion/react-native-reanimated/blob/main/src/ConfigHelper.js#L31).

2. `addWhitelistedUIProps()` is used for any other properties, current allowed props are listed [here](https://github.com/software-mansion/react-native-reanimated/blob/main/src/ConfigHelper.js#L6).

You can use them to animate properties that Reanimated don't support by default.
