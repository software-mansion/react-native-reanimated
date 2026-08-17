import { AppRegistry } from 'react-native';
import ReanimatedAutoRunApp from 'common-app/runtime-tests/reanimated/AutoRunApp';

const RUNTIME_TESTS_APP_NAME = 'FabricExampleRuntimeTests';

AppRegistry.registerComponent(
  RUNTIME_TESTS_APP_NAME,
  () => ReanimatedAutoRunApp
);
