'use strict';

// react-native-web exposes these style helpers only through internal modules.
// The dist/cjs build (with .js extensions) resolves under Metro, strict-ESM
// bundlers and Node's ESM resolver (SSR); a runtime require() would not (#9844).
// eslint-disable-next-line n/no-unpublished-import
import * as createReactDOMStyleModule from 'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js';
// eslint-disable-next-line n/no-unpublished-import
import * as preprocessModule from 'react-native-web/dist/cjs/exports/StyleSheet/preprocess.js';

// createReactDOMStyle is `module.exports = fn` (unwrap `.default`); the preprocess
// helpers are named exports read directly (not on `.default`, a separate fn).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const interopDefault = (moduleExports: any) =>
  moduleExports?.default ?? moduleExports;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createReactDOMStyle: (style: any) => any = interopDefault(
  createReactDOMStyleModule
);

// React Native Web 0.19+
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createTransformValue: (transform: any) => any =
  preprocessModule.createTransformValue;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createTextShadowValue: (style: any) => void | string =
  preprocessModule.createTextShadowValue;
