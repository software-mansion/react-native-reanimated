/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<427d70f8e3e5ae8390f7b9a8cedd7cc7>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/IPerformanceLogger.js
 */

export type Timespan = {
  startTime: number;
  endTime?: number;
  totalTime?: number;
  startExtras?: Extras;
  endExtras?: Extras;
};
export type ExtraValue = number | string | boolean;
export type Extras = {
  [key: string]: ExtraValue;
};
export interface IPerformanceLogger {
  addTimespan(key: string, startTime: number, endTime: number, startExtras?: Extras, endExtras?: Extras): void;
  append(logger: IPerformanceLogger): void;
  clear(): void;
  clearCompleted(): void;
  close(): void;
  currentTimestamp(): number;
  getExtras(): Readonly<{
    [key: string]: ExtraValue | undefined;
  }>;
  getPoints(): Readonly<{
    [key: string]: number | undefined;
  }>;
  getPointExtras(): Readonly<{
    [key: string]: Extras | undefined;
  }>;
  getTimespans(): Readonly<{
    [key: string]: Timespan | undefined;
  }>;
  hasTimespan(key: string): boolean;
  isClosed(): boolean;
  logEverything(): void;
  markPoint(key: string, timestamp?: number, extras?: Extras): void;
  removeExtra(key: string): ExtraValue | undefined;
  setExtra(key: string, value: ExtraValue): void;
  startTimespan(key: string, timestamp?: number, extras?: Extras): void;
  stopTimespan(key: string, timestamp?: number, extras?: Extras): void;
}
