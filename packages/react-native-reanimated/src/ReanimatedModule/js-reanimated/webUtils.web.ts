'use strict';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createReactDOMStyle: (style: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTransformValue: (transform: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let createTextShadowValue: (style: any) => void | string;

try {
  createReactDOMStyle =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
} catch (_e) {}

try {
  // React Native Web 0.19+
  createTransformValue =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    require('react-native-web/dist/exports/StyleSheet/preprocess').createTransformValue;
} catch (_e) {}

try {
  createTextShadowValue =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    require('react-native-web/dist/exports/StyleSheet/preprocess').createTextShadowValue;
} catch (_e) {}
