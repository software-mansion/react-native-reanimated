import type {HostComponent, ViewProps} from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  testProp?: string;
}

export default codegenNativeComponent<NativeProps>(
  'ReanimatedView',
) as HostComponent<NativeProps>;
