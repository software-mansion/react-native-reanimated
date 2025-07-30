/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<a3adeaf6c14cbd492ea6fd58c0448af5>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/LogBox/LogBox.js
 */

import type { IgnorePattern, LogData } from "./Data/LogBoxData";
import type { ExtendedExceptionData } from "./Data/parseLogBoxLog";
export type { LogData, ExtendedExceptionData, IgnorePattern };
interface ILogBox {
  install(): void;
  uninstall(): void;
  isInstalled(): boolean;
  ignoreLogs($$PARAM_0$$: ReadonlyArray<IgnorePattern>): void;
  ignoreAllLogs(value?: boolean): void;
  clearAllLogs(): void;
  addLog(log: LogData): void;
  addException(error: ExtendedExceptionData): void;
}
declare const $$LogBox: ILogBox;
declare type $$LogBox = typeof $$LogBox;
export default $$LogBox;
