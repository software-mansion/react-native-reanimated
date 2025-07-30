/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<88880f9a2f53106f1eb3108cbb08561f>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/oldstylecollections/HTMLCollection.js.flow
 */

import type { ArrayLike } from "../../utils/ArrayLikeUtils";
declare class HTMLCollection<T> implements Iterable<T>, ArrayLike<T> {
  [index: number]: T;
  readonly length: number;
  item(index: number): T | null;
  namedItem(name: string): T | null;
  [Symbol.iterator](): Iterator<T>;
}
export default HTMLCollection;
export declare function createHTMLCollection<T>(elements: ReadonlyArray<T>): HTMLCollection<T>;
