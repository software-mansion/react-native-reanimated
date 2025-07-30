/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<09460b7a213987efa0e55e401b4676a8>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/specs_DEPRECATED/components/ProgressBarAndroidNativeComponent.js
 */

import type { ViewProps } from "../../../../Libraries/Components/View/ViewPropTypes";
import type { ColorValue } from "../../../../Libraries/StyleSheet/StyleSheet";
import type { Double, WithDefault } from "../../../../Libraries/Types/CodegenTypes";
import type { HostComponent } from "../../types/HostComponent";
type NativeProps = Readonly<Omit<ViewProps, keyof {
  styleAttr?: string;
  typeAttr?: string;
  indeterminate: boolean;
  progress?: WithDefault<Double, 0>;
  animating?: WithDefault<boolean, true>;
  color?: ColorValue | undefined;
  testID?: WithDefault<string, "">;
}> & {
  styleAttr?: string;
  typeAttr?: string;
  indeterminate: boolean;
  progress?: WithDefault<Double, 0>;
  animating?: WithDefault<boolean, true>;
  color?: ColorValue | undefined;
  testID?: WithDefault<string, "">;
}>;
declare const $$ProgressBarAndroidNativeComponent: HostComponent<NativeProps>;
declare type $$ProgressBarAndroidNativeComponent = typeof $$ProgressBarAndroidNativeComponent;
export default $$ProgressBarAndroidNativeComponent;
