import ReanimatedAutoRunApp from 'common-app/runtime-tests/reanimated/AutoRunApp';
import { AppRegistry } from 'react-native';

const RUNTIME_TESTS_APP_NAME = 'FabricExampleRuntimeTests';

AppRegistry.registerComponent(
  RUNTIME_TESTS_APP_NAME,
  () => ReanimatedAutoRunApp
);
