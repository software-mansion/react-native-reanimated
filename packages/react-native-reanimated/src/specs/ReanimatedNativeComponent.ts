'use strict';
import type { ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

interface NativeProps extends ViewProps {}

export default codegenNativeComponent<NativeProps>('ReanimatedView', {
  interfaceOnly: true,
});
