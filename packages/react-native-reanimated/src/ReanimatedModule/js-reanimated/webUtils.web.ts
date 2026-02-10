'use strict';

export let createReactDOMStyle: (style: any) => any;

export let createTransformValue: (transform: any) => any;

export let createTextShadowValue: (style: any) => void | string;

try {
  createReactDOMStyle =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, n/no-unpublished-require
    require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
  // eslint-disable-next-line no-empty
} catch (_e) {}

try {
  // React Native Web 0.19+
  createTransformValue =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, n/no-unpublished-require
    require('react-native-web/dist/exports/StyleSheet/preprocess').createTransformValue;
  // eslint-disable-next-line no-empty
} catch (_e) {}

try {
  createTextShadowValue =
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, n/no-unpublished-require
    require('react-native-web/dist/exports/StyleSheet/preprocess').createTextShadowValue;
  // eslint-disable-next-line no-empty
} catch (_e) {}
