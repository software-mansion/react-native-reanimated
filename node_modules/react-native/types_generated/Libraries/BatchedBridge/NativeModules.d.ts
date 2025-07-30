/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<a0005dfd65a918bf6e861758b7d49d54>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/BatchedBridge/NativeModules.js
 */

export type ModuleConfig = [string, null | undefined | {}, null | undefined | ReadonlyArray<string>, null | undefined | ReadonlyArray<number>, null | undefined | ReadonlyArray<number>];
export type MethodType = "async" | "promise" | "sync";
declare let NativeModules: {
  [moduleName: string]: any;
};
declare const $$NativeModules: typeof NativeModules;
declare type $$NativeModules = typeof $$NativeModules;
export default $$NativeModules;
