'use strict';
import type { ViewProps } from 'react-native';
import type { UnsafeMixed } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

interface NativeProps extends ViewProps {
  jsStyle: UnsafeMixed;
  cssTransition: UnsafeMixed;
  cssAnimations: UnsafeMixed;
}

export default codegenNativeComponent<NativeProps>('ReanimatedView', {
  interfaceOnly: true,
});
