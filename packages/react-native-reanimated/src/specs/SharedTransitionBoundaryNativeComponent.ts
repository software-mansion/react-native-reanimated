'use strict';
import type { HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

export interface NativeProps extends ViewProps {
  isActive: boolean;
}

export default codegenNativeComponent<NativeProps>(
  'RNReanimatedSharedTransitionBoundary',
  { interfaceOnly: true }
) as HostComponent<NativeProps>;
