'use strict';
import type { ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

interface NativeProps extends ViewProps {}

// ts-prune-ignore-next-line
export default codegenNativeComponent<NativeProps>('ReanimatedView');
