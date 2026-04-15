---
id: about
title: 'About'
sidebar_label: 'About'
---

# Reanimated Babel Plugin

Reanimated Babel plugin was moved to `react-native-worklets` and renamed to [Worklets Babel plugin](https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/about/). Please make sure to import the plugin from `react-native-worklets/plugin` in your `babel.config.js`.

```diff
plugins: [
-  'react-native-reanimated/plugin',
+  'react-native-worklets/plugin',
],
```

For backwards compatibility we kept it as an export in Reanimated 4 but we strongly recommend using `react-native-worklets/plugin` directly.
