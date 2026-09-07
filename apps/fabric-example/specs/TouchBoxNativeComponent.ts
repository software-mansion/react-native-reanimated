import type { CodegenTypes, HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

export interface NativeProps extends ViewProps {
  controllerId?: CodegenTypes.Int32;
}

export default codegenNativeComponent<NativeProps>(
  'TouchBox'
) as HostComponent<NativeProps>;
