/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<cdd29c0c93a9da288eea632e724df4c0>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Core/Devtools/symbolicateStackTrace.js
 */

import type { StackFrame } from "../NativeExceptionsManager";
export type CodeFrame = Readonly<{
  content: string;
  location: {
    row: number;
    column: number;
  } | undefined;
  fileName: string;
}>;
export type SymbolicatedStackTrace = Readonly<{
  stack: Array<StackFrame>;
  codeFrame: CodeFrame | undefined;
}>;
declare function symbolicateStackTrace(stack: Array<StackFrame>, extraData?: unknown): Promise<SymbolicatedStackTrace>;
export default symbolicateStackTrace;
