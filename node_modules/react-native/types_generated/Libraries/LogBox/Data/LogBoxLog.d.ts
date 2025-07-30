/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<42d1c4e4d80bb818b5a33af94fb6fffe>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/LogBox/Data/LogBoxLog.js
 */

import type { Stack } from "./LogBoxSymbolication";
import type { Category, CodeFrame, ComponentStack, ComponentStackType, Message } from "./parseLogBoxLog";
type SymbolicationStatus = "NONE" | "PENDING" | "COMPLETE" | "FAILED";
export type LogLevel = "warn" | "error" | "fatal" | "syntax";
export type LogBoxLogData = Readonly<{
  level: LogLevel;
  type?: string | undefined;
  message: Message;
  stack: Stack;
  category: string;
  componentStackType?: ComponentStackType;
  componentStack: ComponentStack;
  codeFrame?: CodeFrame | undefined;
  isComponentError: boolean;
  extraData?: unknown;
  onNotificationPress?: (() => void) | undefined;
}>;
declare class LogBoxLog {
  message: Message;
  type: null | undefined | string;
  category: Category;
  componentStack: ComponentStack;
  componentStackType: ComponentStackType;
  stack: Stack;
  count: number;
  level: LogLevel;
  codeFrame: null | undefined | CodeFrame;
  componentCodeFrame: null | undefined | CodeFrame;
  isComponentError: boolean;
  extraData: unknown | void;
  symbolicated: Readonly<{
    error: null;
    stack: null;
    status: "NONE";
  }> | Readonly<{
    error: null;
    stack: null;
    status: "PENDING";
  }> | Readonly<{
    error: null;
    stack: Stack;
    status: "COMPLETE";
  }> | Readonly<{
    error: Error;
    stack: null;
    status: "FAILED";
  }>;
  symbolicatedComponentStack: Readonly<{
    error: null;
    componentStack: null;
    status: "NONE";
  }> | Readonly<{
    error: null;
    componentStack: null;
    status: "PENDING";
  }> | Readonly<{
    error: null;
    componentStack: ComponentStack;
    status: "COMPLETE";
  }> | Readonly<{
    error: Error;
    componentStack: null;
    status: "FAILED";
  }>;
  onNotificationPress: null | undefined | (() => void);
  constructor(data: LogBoxLogData);
  incrementCount(): void;
  getAvailableStack(): Stack;
  getAvailableComponentStack(): ComponentStack;
  retrySymbolicate(callback?: (status: SymbolicationStatus) => void): void;
  symbolicate(callback?: (status: SymbolicationStatus) => void): void;
  handleSymbolicate(callback?: (status: SymbolicationStatus) => void): void;
  updateStatus(error: null | undefined | Error, stack: null | undefined | Stack, codeFrame: null | undefined | CodeFrame, callback?: (status: SymbolicationStatus) => void): void;
  updateComponentStackStatus(error: null | undefined | Error, componentStack: null | undefined | ComponentStack, codeFrame: null | undefined | CodeFrame, callback?: (status: SymbolicationStatus) => void): void;
}
export default LogBoxLog;
