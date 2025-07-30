/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<47d84dd0082ba690ca7a260b25598e42>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Core/ExceptionsManager.js
 */

import type { ExceptionData } from "./NativeExceptionsManager";
export declare class SyntheticError extends Error {
  name: string;
}
type ExceptionDecorator = ($$PARAM_0$$: ExceptionData) => ExceptionData;
declare const decoratedExtraDataKey: "RN$ErrorExtraDataKey";
/**
 * Allows the app to add information to the exception report before it is sent
 * to native. This API is not final.
 */

declare function unstable_setExceptionDecorator(exceptionDecorator: null | undefined | ExceptionDecorator): void;
/**
 * Logs exceptions to the (native) console and displays them
 */
declare function handleException(e: unknown, isFatal: boolean): void;
/**
 * Shows a redbox with stacktrace for all console.error messages.  Disable by
 * setting `console.reportErrorsAsExceptions = false;` in your app.
 */
declare function installConsoleErrorReporter(): void;
declare const ExceptionsManager: {
  decoratedExtraDataKey: typeof decoratedExtraDataKey;
  handleException: typeof handleException;
  installConsoleErrorReporter: typeof installConsoleErrorReporter;
  SyntheticError: typeof SyntheticError;
  unstable_setExceptionDecorator: typeof unstable_setExceptionDecorator;
};
declare const $$ExceptionsManager: typeof ExceptionsManager;
declare type $$ExceptionsManager = typeof $$ExceptionsManager;
export default $$ExceptionsManager;
