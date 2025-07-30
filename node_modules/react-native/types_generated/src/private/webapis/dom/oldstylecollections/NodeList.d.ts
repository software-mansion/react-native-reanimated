/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<23642911fc596c9fbf0cc75de275f195>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/oldstylecollections/NodeList.js.flow
 */

import type { ArrayLike } from "../../utils/ArrayLikeUtils";
declare class NodeList<T> implements Iterable<T>, ArrayLike<T> {
  [index: number]: T;
  readonly length: number;
  item(index: number): T | null;
  entries(): Iterator<[number, T]>;
  forEach<ThisType>(callbackFn: (value: T, index: number, array: NodeList<T>) => unknown, thisArg?: ThisType): void;
  keys(): Iterator<number>;
  values(): Iterator<T>;
  [Symbol.iterator](): Iterator<T>;
}
export default NodeList;
export declare function createNodeList<T>(elements: ReadonlyArray<T>): NodeList<T>;
