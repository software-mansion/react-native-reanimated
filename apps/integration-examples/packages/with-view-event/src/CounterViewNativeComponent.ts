import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';

export type CountEvent = Readonly<{
  count: CodegenTypes.Int32;
}>;

export interface NativeProps extends ViewProps {
  onCount?: CodegenTypes.DirectEventHandler<CountEvent>;
}

export default codegenNativeComponent<NativeProps>(
  'CounterView'
) as HostComponent<NativeProps>;
