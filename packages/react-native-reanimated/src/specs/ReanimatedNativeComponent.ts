'use strict';
import type { HostComponent, ViewProps } from 'react-native';

// This rename is important to avoid problem with Jest auto-mocking
import createNativeView from './codegenNativeComponent';

interface NativeProps extends ViewProps {}

export default createNativeView<NativeProps>(
  'ReanimatedView'
) as HostComponent<NativeProps>;
