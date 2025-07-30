/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<5bc6734f92d4f0433408d1e20f2e0473>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/nodes/ReadOnlyCharacterData.js
 */

import type ReadOnlyElement from "./ReadOnlyElement";
import ReadOnlyNode from "./ReadOnlyNode";
declare class ReadOnlyCharacterData extends ReadOnlyNode {
  get nextElementSibling(): ReadOnlyElement | null;
  get previousElementSibling(): ReadOnlyElement | null;
  get data(): string;
  get length(): number;
  get textContent(): string;
  get nodeValue(): string;
  substringData(offset: number, count: number): string;
}
export default ReadOnlyCharacterData;
