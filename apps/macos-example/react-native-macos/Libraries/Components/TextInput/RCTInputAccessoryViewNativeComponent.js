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
import type {ViewProps} from '../View/ViewPropTypes';

import codegenNativeComponent from '../../Utilities/codegenNativeComponent';

type NativeProps = $ReadOnly<{|
  ...ViewProps,
  backgroundColor?: ?ColorValue,
|}>;

export default (codegenNativeComponent<NativeProps>('InputAccessory', {
  interfaceOnly: true,
  paperComponentName: 'RCTInputAccessoryView',
  excludedPlatforms: ['android'],
}): HostComponent<NativeProps>);
