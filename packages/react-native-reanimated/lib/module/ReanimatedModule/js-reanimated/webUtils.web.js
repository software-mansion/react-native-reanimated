'use strict';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createReactDOMStyle;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTransformValue;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTextShadowValue;
try {
  createReactDOMStyle =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
} catch (e) {}
try {
  // React Native Web 0.19+
  createTransformValue =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-web/dist/exports/StyleSheet/preprocess').createTransformValue;
} catch (e) {}
try {
  createTextShadowValue =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-web/dist/exports/StyleSheet/preprocess').createTextShadowValue;
} catch (e) {}
//# sourceMappingURL=webUtils.web.js.map