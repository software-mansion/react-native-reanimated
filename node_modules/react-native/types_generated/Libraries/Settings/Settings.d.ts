/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<cad18a5377d3e3d4d7bcc9769b5c32bc>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Settings/Settings.js
 */

declare let Settings: {
  get(key: string): any;
  set(settings: Object): void;
  watchKeys(keys: string | Array<string>, callback: () => void): number;
  clearWatch(watchId: number): void;
};
declare const $$Settings: typeof Settings;
declare type $$Settings = typeof $$Settings;
export default $$Settings;
