'use strict';
import type { HostComponent, ViewProps } from 'react-native';

import codegenNativeComponent from './codegenNativeComponent';

interface NativeProps extends ViewProps {}

export default codegenNativeComponent<NativeProps>(
  'ReanimatedView'
) as HostComponent<NativeProps>;
