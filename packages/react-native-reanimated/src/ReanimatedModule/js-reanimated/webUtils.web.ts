'use strict';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@ericcornelissen/top/no-top-level-variables
export let createReactDOMStyle: (style: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@ericcornelissen/top/no-top-level-variables
export let createTransformValue: (transform: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@ericcornelissen/top/no-top-level-variables
export let createTextShadowValue: (style: any) => void | string;

// eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
try {
  createReactDOMStyle =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
} catch (e) {}

// eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
try {
  // React Native Web 0.19+
  createTransformValue =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native-web/dist/exports/StyleSheet/preprocess').createTransformValue;
} catch (e) {}

// eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
try {
  createTextShadowValue =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native-web/dist/exports/StyleSheet/preprocess').createTextShadowValue;
} catch (e) {}
