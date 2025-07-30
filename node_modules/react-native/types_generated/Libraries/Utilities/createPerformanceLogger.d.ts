/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<6f12b067782abb8a2c8baf4f02ab14f7>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/createPerformanceLogger.js
 */

import type { Extras, ExtraValue, IPerformanceLogger, Timespan } from "./IPerformanceLogger";
export declare const getCurrentTimestamp: () => number;
export declare type getCurrentTimestamp = typeof getCurrentTimestamp;
export type { Extras, ExtraValue, IPerformanceLogger, Timespan };
/**
 * This function creates performance loggers that can be used to collect and log
 * various performance data such as timespans, points and extras.
 * The loggers need to have minimal overhead since they're used in production.
 */
declare function createPerformanceLogger(): IPerformanceLogger;
export default createPerformanceLogger;
