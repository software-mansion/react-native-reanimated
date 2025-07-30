/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<02b81fede24b848a31c5e958c93855b2>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Share/Share.js
 */

import type { ColorValue } from "../StyleSheet/StyleSheet";
export type ShareContent = {
  title?: string;
  url: string;
  message?: string;
} | {
  title?: string;
  url?: string;
  message: string;
};
export type ShareOptions = {
  dialogTitle?: string;
  excludedActivityTypes?: Array<string>;
  tintColor?: ColorValue;
  subject?: string;
  anchor?: number;
};
export type ShareAction = {
  action: "sharedAction" | "dismissedAction";
  activityType?: string | null;
};
declare class Share {
  static share(content: ShareContent, options?: ShareOptions): Promise<{
    action: string;
    activityType: string | undefined;
  }>;
  static sharedAction: "sharedAction";
  static dismissedAction: "dismissedAction";
}
export default Share;
