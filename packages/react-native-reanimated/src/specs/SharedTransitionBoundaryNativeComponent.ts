'use strict';
import type { ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

interface NativeProps extends ViewProps {
  isActive: boolean;
}

export default codegenNativeComponent<NativeProps>(
  'REASharedTransitionBoundary',
  { interfaceOnly: true }
);
