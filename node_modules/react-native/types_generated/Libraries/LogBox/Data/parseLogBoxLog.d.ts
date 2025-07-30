/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<9dac1853989d2f50d619f9a7306c70c2>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/LogBox/Data/parseLogBoxLog.js
 */

import type { ExceptionData } from "../../Core/NativeExceptionsManager";
import type { LogBoxLogData } from "./LogBoxLog";
export declare function hasComponentStack(args: ReadonlyArray<unknown>): boolean;
export type ExtendedExceptionData = ExceptionData & {
  isComponentError: boolean;
};
export type Category = string;
export type CodeFrame = Readonly<{
  content: string;
  location: {
    row: number;
    column: number;
  } | undefined;
  fileName: string;
  collapse?: boolean;
}>;
export type Message = Readonly<{
  content: string;
  substitutions: ReadonlyArray<Readonly<{
    length: number;
    offset: number;
  }>>;
}>;
export type ComponentStack = ReadonlyArray<CodeFrame>;
export type ComponentStackType = "legacy" | "stack";
export declare function parseInterpolation(args: ReadonlyArray<unknown>): Readonly<{
  category: Category;
  message: Message;
}>;
export declare function parseComponentStack(message: string): {
  type: ComponentStackType;
  stack: ComponentStack;
};
export declare function parseLogBoxException(error: ExtendedExceptionData): LogBoxLogData;
export declare function withoutANSIColorStyles(message: unknown): unknown;
export declare function parseLogBoxLog(args: ReadonlyArray<unknown>): {
  componentStack: ComponentStack;
  componentStackType: ComponentStackType;
  category: Category;
  message: Message;
};
