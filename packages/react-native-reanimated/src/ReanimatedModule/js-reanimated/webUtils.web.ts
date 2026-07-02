'use strict';

// This module is resolved only on web, where react-native-web is always
// present, so the helpers can be imported statically. Loading them with a
// runtime require() breaks under strict ESM bundlers (webpack, Rollup,
// esbuild): a module with ESM exports gets no CommonJS require at runtime,
// so the helpers stayed undefined and _updatePropsJS crashed on every
// animation frame (#9844). Only Metro tolerated the previous mixed form.
// The .js extensions keep the imports fully specified, which strict ESM
// bundlers require when resolving from the ESM build output.

// @ts-ignore react-native-web internals have no type declarations.
// eslint-disable-next-line n/no-unpublished-import
import createReactDOMStyleRNW from 'react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle.js';
// @ts-ignore react-native-web internals have no type declarations.
// eslint-disable-next-line n/no-unpublished-import
import * as preprocessRNW from 'react-native-web/dist/exports/StyleSheet/preprocess.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createReactDOMStyle: (style: any) => any = createReactDOMStyleRNW;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createTransformValue: (transform: any) => any =
  preprocessRNW.createTransformValue;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createTextShadowValue: (style: any) => void | string =
  preprocessRNW.createTextShadowValue;
