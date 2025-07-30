/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<f9e9e91a02ecd9b761a59418859a98a3>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/LogBox/Data/LogBoxSymbolication.js
 */

import type { SymbolicatedStackTrace } from "../../Core/Devtools/symbolicateStackTrace";
import type { StackFrame } from "../../Core/NativeExceptionsManager";
export type Stack = Array<StackFrame>;
export declare function deleteStack(stack: Stack): void;
export declare function symbolicate(stack: Stack, extraData?: unknown): Promise<SymbolicatedStackTrace>;
