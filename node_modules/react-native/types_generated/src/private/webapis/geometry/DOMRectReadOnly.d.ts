/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<616e66ec7fe11d280a5dff59614c7615>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/geometry/DOMRectReadOnly.js
 */

/**
 * The JSDoc comments in this file have been extracted from [DOMRectReadOnly](https://developer.mozilla.org/en-US/docs/Web/API/DOMRectReadOnly).
 * Content by [Mozilla Contributors](https://developer.mozilla.org/en-US/docs/Web/API/DOMRectReadOnly/contributors.txt),
 * licensed under [CC-BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/).
 */

export interface DOMRectInit {
  x?: number | undefined;
  y?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
}
/**
 * The `DOMRectReadOnly` interface specifies the standard properties used by `DOMRect` to define a rectangle whose properties are immutable.
 *
 * This is a (mostly) spec-compliant version of `DOMRectReadOnly` (https://developer.mozilla.org/en-US/docs/Web/API/DOMRectReadOnly).
 */
declare class DOMRectReadOnly {
  constructor(x: null | undefined | number, y: null | undefined | number, width: null | undefined | number, height: null | undefined | number);
  get x(): number;
  get y(): number;
  get width(): number;
  get height(): number;
  get top(): number;
  get right(): number;
  get bottom(): number;
  get left(): number;
  toJSON(): {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  static fromRect(rect?: null | undefined | DOMRectInit): DOMRectReadOnly;
}
export default DOMRectReadOnly;
