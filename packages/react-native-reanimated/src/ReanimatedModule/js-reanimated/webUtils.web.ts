'use strict';

// This module is resolved only on web, where react-native-web is always
// present, so the helpers can be imported statically. Loading them with a
// runtime require() breaks under strict ESM bundlers (webpack, Rollup,
// esbuild): a module with ESM exports gets no CommonJS require at runtime,
// so the helpers stayed undefined and _updatePropsJS crashed on every
// animation frame (#9844). Only Metro tolerated the previous mixed form.
//
// The imports point at react-native-web's CommonJS build with fully
// specified .js extensions. SSR frameworks (e.g. Next.js) externalize
// react-native-web and load it with Node's native ESM resolver, which
// rejects the extensionless relative imports inside the ESM build in
// dist/exports, while the CommonJS build loads everywhere.

// @ts-ignore react-native-web internals have no type declarations.
// eslint-disable-next-line n/no-unpublished-import
import * as createReactDOMStyleModule from 'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js';
// @ts-ignore react-native-web internals have no type declarations.
// eslint-disable-next-line n/no-unpublished-import
import * as preprocessModule from 'react-native-web/dist/cjs/exports/StyleSheet/preprocess.js';

// Node's CJS-ESM interop and bundler interop expose a transpiled default
// export under `.default`; fall back to the namespace itself just in case.
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
