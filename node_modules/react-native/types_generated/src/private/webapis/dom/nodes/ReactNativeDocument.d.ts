/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<d5ec67f17a62b00a11959479b7c7c7de>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/nodes/ReactNativeDocument.js
 */

import type { RootTag } from "../../../../../Libraries/ReactNative/RootTag";
import type HTMLCollection from "../oldstylecollections/HTMLCollection";
import type { ReactNativeDocumentInstanceHandle } from "./internals/ReactNativeDocumentInstanceHandle";
import type ReadOnlyElement from "./ReadOnlyElement";
import ReactNativeElement from "./ReactNativeElement";
import ReadOnlyNode from "./ReadOnlyNode";
declare class ReactNativeDocument extends ReadOnlyNode {
  constructor(rootTag: RootTag, instanceHandle: ReactNativeDocumentInstanceHandle);
  get childElementCount(): number;
  get children(): HTMLCollection<ReadOnlyElement>;
  get documentElement(): ReactNativeElement;
  get firstElementChild(): ReadOnlyElement | null;
  get lastElementChild(): ReadOnlyElement | null;
  get nodeName(): string;
  get nodeType(): number;
  get nodeValue(): null;
  get textContent(): null;
}
export default ReactNativeDocument;
export declare function createReactNativeDocument(rootTag: RootTag): ReactNativeDocument;
