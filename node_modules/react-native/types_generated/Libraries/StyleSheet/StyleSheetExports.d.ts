/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<fabdc2c1c30842e3c26e05dd87efa447>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/StyleSheet/StyleSheetExports.js.flow
 */

import type { ____Styles_Internal } from "./StyleSheetTypes";
import composeStyles from "../../src/private/styles/composeStyles";
import flattenStyle from "./flattenStyle";
/**
 * This is defined as the width of a thin line on the platform. It can be
 * used as the thickness of a border or division between two elements.
 * Example:
 * ```
 *   {
 *     borderBottomColor: '#bbb',
 *     borderBottomWidth: StyleSheet.hairlineWidth
 *   }
 * ```
 *
 * This constant will always be a round number of pixels (so a line defined
 * by it look crisp) and will try to match the standard width of a thin line
 * on the underlying platform. However, you should not rely on it being a
 * constant size, because on different platforms and screen densities its
 * value may be calculated differently.
 */
export declare const hairlineWidth: number;
export declare type hairlineWidth = typeof hairlineWidth;
/**
 * A very common pattern is to create overlays with position absolute and zero positioning,
 * so `absoluteFill` can be used for convenience and to reduce duplication of these repeated
 * styles.
 */
export declare const absoluteFill: any;
export declare type absoluteFill = typeof absoluteFill;
/**
 * Sometimes you may want `absoluteFill` but with a couple tweaks - `absoluteFillObject` can be
 * used to create a customized entry in a `StyleSheet`, e.g.:
 *
 *   const styles = StyleSheet.create({
 *     wrapper: {
 *       ...StyleSheet.absoluteFillObject,
 *       top: 10,
 *       backgroundColor: 'transparent',
 *     },
 *   });
 */
export declare const absoluteFillObject: {
  readonly bottom: 0;
  readonly left: 0;
  readonly position: "absolute";
  readonly right: 0;
  readonly top: 0;
};
export declare type absoluteFillObject = typeof absoluteFillObject;
/**
 * Combines two styles such that style2 will override any styles in style1.
 * If either style is falsy, the other one is returned without allocating
 * an array, saving allocations and maintaining reference equality for
 * PureComponent checks.
 */
export declare const compose: typeof composeStyles;
export declare type compose = typeof compose;
/**
 * Flattens an array of style objects, into one aggregated style object.
 *
 * Example:
 * ```
 * const styles = StyleSheet.create({
 *   listItem: {
 *     flex: 1,
 *     fontSize: 16,
 *     color: 'white'
 *   },
 *   selectedListItem: {
 *     color: 'green'
 *   }
 * });
 *
 * StyleSheet.flatten([styles.listItem, styles.selectedListItem])
 * // returns { flex: 1, fontSize: 16, color: 'green' }
 * ```
 */
export declare const flatten: typeof flattenStyle;
export declare type flatten = typeof flatten;
/**
 * WARNING: EXPERIMENTAL. Breaking changes will probably happen a lot and will
 * not be reliably announced. The whole thing might be deleted, who knows? Use
 * at your own risk.
 *
 * Sets a function to use to pre-process a style property value. This is used
 * internally to process color and transform values. You should not use this
 * unless you really know what you are doing and have exhausted other options.
 */
export declare const setStyleAttributePreprocessor: (property: string, process: (nextProp: any) => any) => void;
export declare type setStyleAttributePreprocessor = typeof setStyleAttributePreprocessor;
/**
 * An identity function for creating style sheets.
 */
export declare const create: <S extends ____Styles_Internal>(obj: S & ____Styles_Internal) => Readonly<S>;
export declare type create = typeof create;
