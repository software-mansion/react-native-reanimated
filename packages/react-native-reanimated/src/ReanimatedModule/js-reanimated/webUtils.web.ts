'use strict';

// Static imports so that strict ESM bundlers (webpack, Rollup, esbuild)
// resolve the helpers at build time - a runtime require() is not available
// in ESM modules there, which left the helpers undefined (#9844). The
// CommonJS build is used because SSR frameworks load externalized
// react-native-web with Node's ESM resolver, which rejects the
// extensionless relative imports inside the dist/exports ESM build.

// @ts-ignore react-native-web internals have no type declarations.
// eslint-disable-next-line n/no-unpublished-import
import * as createReactDOMStyleModule from 'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js';
// @ts-ignore react-native-web internals have no type declarations.
// eslint-disable-next-line n/no-unpublished-import
import * as preprocessModule from 'react-native-web/dist/cjs/exports/StyleSheet/preprocess.js';

// Node exposes a transpiled CJS default export as `.default`, bundlers as
// the module itself.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const interopDefault = (module: any) => module.default ?? module;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createReactDOMStyle: (style: any) => any = interopDefault(
  createReactDOMStyleModule
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createTransformValue: (transform: any) => any =
  preprocessModule.createTransformValue;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createTextShadowValue: (style: any) => void | string =
  preprocessModule.createTextShadowValue;
