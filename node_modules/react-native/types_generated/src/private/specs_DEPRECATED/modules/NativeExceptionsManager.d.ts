/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<71aa539fcf7b5cafee0f2f1b18cbe25a>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/specs_DEPRECATED/modules/NativeExceptionsManager.js
 */

import type { TurboModule } from "../../../../Libraries/TurboModule/RCTExport";
export type StackFrame = {
  column: number | undefined;
  file: string | undefined;
  lineNumber: number | undefined;
  methodName: string;
  collapse?: boolean;
};
export type ExceptionData = {
  message: string;
  originalMessage: string | undefined;
  name: string | undefined;
  componentStack: string | undefined;
  stack: Array<StackFrame>;
  id: number;
  isFatal: boolean;
  extraData?: Object;
};
export interface Spec extends TurboModule {
  readonly reportFatalException: (message: string, stack: Array<StackFrame>, exceptionId: number) => void;
  readonly reportSoftException: (message: string, stack: Array<StackFrame>, exceptionId: number) => void;
  readonly reportException?: (data: ExceptionData) => void;
  readonly dismissRedbox?: () => void;
}
declare const ExceptionsManager: {
  reportFatalException(message: string, stack: Array<StackFrame>, exceptionId: number): void;
  reportSoftException(message: string, stack: Array<StackFrame>, exceptionId: number): void;
  dismissRedbox(): void;
  reportException(data: ExceptionData): void;
};
declare const $$NativeExceptionsManager: typeof ExceptionsManager;
declare type $$NativeExceptionsManager = typeof $$NativeExceptionsManager;
export default $$NativeExceptionsManager;
