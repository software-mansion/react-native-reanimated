/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<10f9e6f4e4767e465b2c864e927e0fb6>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/nodes/ReadOnlyNode.js
 */

import type NodeList from "../oldstylecollections/NodeList";
import type { InstanceHandle } from "./internals/NodeInternals";
import type ReactNativeDocument from "./ReactNativeDocument";
import type ReadOnlyElement from "./ReadOnlyElement";
declare class ReadOnlyNode {
  constructor(instanceHandle: InstanceHandle, ownerDocument: ReactNativeDocument | null);
  get childNodes(): NodeList<ReadOnlyNode>;
  get firstChild(): ReadOnlyNode | null;
  get isConnected(): boolean;
  get lastChild(): ReadOnlyNode | null;
  get nextSibling(): ReadOnlyNode | null;
  get nodeName(): string;
  get nodeType(): number;
  get nodeValue(): string | null;
  get ownerDocument(): ReactNativeDocument | null;
  get parentElement(): ReadOnlyElement | null;
  get parentNode(): ReadOnlyNode | null;
  get previousSibling(): ReadOnlyNode | null;
  get textContent(): string;
  compareDocumentPosition(otherNode: ReadOnlyNode): number;
  contains(otherNode: ReadOnlyNode): boolean;
  getRootNode(): ReadOnlyNode;
  hasChildNodes(): boolean;
  static ELEMENT_NODE: number;
  static ATTRIBUTE_NODE: number;
  static TEXT_NODE: number;
  static CDATA_SECTION_NODE: number;
  static ENTITY_REFERENCE_NODE: number;
  static ENTITY_NODE: number;
  static PROCESSING_INSTRUCTION_NODE: number;
  static COMMENT_NODE: number;
  static DOCUMENT_NODE: number;
  static DOCUMENT_TYPE_NODE: number;
  static DOCUMENT_FRAGMENT_NODE: number;
  static NOTATION_NODE: number;
  static DOCUMENT_POSITION_DISCONNECTED: number;
  static DOCUMENT_POSITION_PRECEDING: number;
  static DOCUMENT_POSITION_FOLLOWING: number;
  static DOCUMENT_POSITION_CONTAINS: number;
  static DOCUMENT_POSITION_CONTAINED_BY: number;
  static DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: number;
}
export default ReadOnlyNode;
export declare function getChildNodes(node: ReadOnlyNode): ReadonlyArray<ReadOnlyNode>;
