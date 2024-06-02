/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {HostComponent} from '../../Renderer/shims/ReactNativeTypes';
import type {ColorValue} from '../../StyleSheet/StyleSheet';
import type {Double, WithDefault} from '../../Types/CodegenTypes';
import type {ViewProps} from '../View/ViewPropTypes';

import codegenNativeComponent from '../../Utilities/codegenNativeComponent';

type NativeProps = $ReadOnly<{|
  ...ViewProps,

  //Props
  styleAttr?: string,
  typeAttr?: string,
  indeterminate: boolean,
  progress?: WithDefault<Double, 0>,
  animating?: WithDefault<boolean, true>,
  color?: ?ColorValue,
  testID?: WithDefault<string, ''>,
|}>;

export default (codegenNativeComponent<NativeProps>('AndroidProgressBar', {
  interfaceOnly: true,
}): HostComponent<NativeProps>);
