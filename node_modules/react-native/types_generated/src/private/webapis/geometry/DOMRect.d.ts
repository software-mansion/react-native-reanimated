/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<4a98b16bfea3e92b462c8cdc6ab88237>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/geometry/DOMRect.js
 */

/**
 * The JSDoc comments in this file have been extracted from [DOMRect](https://developer.mozilla.org/en-US/docs/Web/API/DOMRect).
 * Content by [Mozilla Contributors](https://developer.mozilla.org/en-US/docs/Web/API/DOMRect/contributors.txt),
 * licensed under [CC-BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/).
 */

import DOMRectReadOnly, { type DOMRectInit } from "./DOMRectReadOnly";
/**
 * A `DOMRect` describes the size and position of a rectangle.
 * The type of box represented by the `DOMRect` is specified by the method or property that returned it.
 *
 * This is a (mostly) spec-compliant version of `DOMRect` (https://developer.mozilla.org/en-US/docs/Web/API/DOMRect).
 */
declare class DOMRect extends DOMRectReadOnly {
  get x(): number;
  set x(x: null | undefined | number);
  get y(): number;
  set y(y: null | undefined | number);
  get width(): number;
  set width(width: null | undefined | number);
  get height(): number;
  set height(height: null | undefined | number);
  static fromRect(rect?: null | undefined | DOMRectInit): DOMRect;
}
export default DOMRect;
