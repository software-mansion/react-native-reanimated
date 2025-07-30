/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<a40384c6d02e7a6a3b8fa5316f22ae05>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Core/ReactFiberErrorDialog.js
 */

export type CapturedError = {
  readonly componentStack: string;
  readonly error: unknown;
  readonly errorBoundary: {} | undefined;
};
declare const ReactFiberErrorDialog: {
  /**
   * Intercept lifecycle errors and ensure they are shown with the correct stack
   * trace within the native redbox component.
   */
  showErrorDialog($$PARAM_0$$: CapturedError): boolean;
};
declare const $$ReactFiberErrorDialog: typeof ReactFiberErrorDialog;
declare type $$ReactFiberErrorDialog = typeof $$ReactFiberErrorDialog;
export default $$ReactFiberErrorDialog;
