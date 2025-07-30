/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<b96575370eae0e613784f3b8d75a8c52>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/specs_DEPRECATED/modules/NativeDialogManagerAndroid.js
 */

import type { TurboModule } from "../../../../Libraries/TurboModule/RCTExport";
type DialogAction = string;
type DialogButtonKey = number;
export type DialogOptions = {
  title?: string;
  message?: string;
  buttonPositive?: string;
  buttonNegative?: string;
  buttonNeutral?: string;
  items?: Array<string>;
  cancelable?: boolean;
};
export interface Spec extends TurboModule {
  readonly getConstants: () => {
    readonly buttonClicked: DialogAction;
    readonly dismissed: DialogAction;
    readonly buttonPositive: DialogButtonKey;
    readonly buttonNegative: DialogButtonKey;
    readonly buttonNeutral: DialogButtonKey;
  };
  readonly showAlert: (config: DialogOptions, onError: (error: string) => void, onAction: (action: DialogAction, buttonKey?: DialogButtonKey) => void) => void;
}
declare const $$NativeDialogManagerAndroid: null | undefined | Spec;
declare type $$NativeDialogManagerAndroid = typeof $$NativeDialogManagerAndroid;
export default $$NativeDialogManagerAndroid;
