/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<2942b74637e4b1b4f304b404c0647d71>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/BackHandler.js.flow
 */

export type BackPressEventName = "backPress" | "hardwareBackPress";
type TBackHandler = {
  exitApp(): void;
  addEventListener(eventName: BackPressEventName, handler: () => boolean | undefined): {
    remove: () => void;
  };
};
declare const BackHandler: TBackHandler;
declare const $$BackHandler: typeof BackHandler;
declare type $$BackHandler = typeof $$BackHandler;
export default $$BackHandler;
