import { NativeModules } from 'react-native';

const { ReanimatedModule } = NativeModules;

export default global.NativeReanimated
  ? global.NativeReanimated
  : ReanimatedModule;
