/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<dcb9fe4ce55279385a0a42d98baac3b4>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/ProgressBarAndroid/ProgressBarAndroid.js
 */

import * as React from "react";
import type $$IMPORT_TYPEOF_1$$ from "./ProgressBarAndroidNativeComponent";
type ProgressBarAndroidNativeComponentType = typeof $$IMPORT_TYPEOF_1$$;
import type { ProgressBarAndroidProps } from "./ProgressBarAndroidTypes";
export type { ProgressBarAndroidProps };
type Omit<T, K> = T extends any ? Pick<T, Exclude<keyof T, K>> : T;
declare let ProgressBarAndroid: (props: Omit<Omit<ProgressBarAndroidProps, never>, keyof {
  ref?: React.Ref<React.ComponentRef<ProgressBarAndroidNativeComponentType>>;
}> & {
  ref?: React.Ref<React.ComponentRef<ProgressBarAndroidNativeComponentType>>;
}) => React.ReactNode;
/**
 * ProgressBarAndroid has been extracted from react-native core and will be removed in a future release.
 * It can now be installed and imported from `@react-native-community/progress-bar-android` instead of 'react-native'.
 * @see https://github.com/react-native-community/progress-bar-android
 * @deprecated
 */
declare const $$ProgressBarAndroid: typeof ProgressBarAndroid;
declare type $$ProgressBarAndroid = typeof $$ProgressBarAndroid;
export default $$ProgressBarAndroid;
