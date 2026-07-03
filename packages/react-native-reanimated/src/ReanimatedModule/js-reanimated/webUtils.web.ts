'use strict';

// react-native-web exposes these style helpers only through internal modules.
// They're imported statically so strict-ESM bundlers (webpack, Rollup, esbuild)
// and SSR resolve them at build time and they're always defined synchronously - a
// runtime require() isn't available in ESM there, which left them undefined and
// crashed _updatePropsJS (#9844). The dist/cjs build (with explicit .js extensions)
// is used because SSR frameworks load an externalized react-native-web with Node's
// ESM resolver, which rejects the extensionless relative imports in dist/exports.
// eslint-disable-next-line n/no-unpublished-import
import * as createReactDOMStyleModule from 'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js';
// eslint-disable-next-line n/no-unpublished-import
import * as preprocessModule from 'react-native-web/dist/cjs/exports/StyleSheet/preprocess.js';

// createReactDOMStyle is a CJS default export (module.exports = fn), so unwrap
// `.default`. createTransformValue / createTextShadowValue are named exports on
// module.exports and are read directly - they're not on `.default`, which is a
// separate `preprocess` function.
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
