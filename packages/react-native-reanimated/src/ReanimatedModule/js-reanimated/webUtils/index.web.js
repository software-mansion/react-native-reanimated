/* eslint-disable no-empty */
'use strict';

exports.createReactDOMStyle = undefined;
exports.createTransformValue = undefined;
exports.createTextShadowValue = undefined;

try {
  exports.createReactDOMStyle =
    require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
} catch (_e) {}

try {
  // React Native Web 0.19+
  exports.createTransformValue =
    require('react-native-web/dist/exports/StyleSheet/preprocess').createTransformValue;
} catch (_e) {}

try {
  exports.createTextShadowValue =
    require('react-native-web/dist/exports/StyleSheet/preprocess').createTextShadowValue;
} catch (_e) {}
