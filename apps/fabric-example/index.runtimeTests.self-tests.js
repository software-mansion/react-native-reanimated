import SelfTestsAutoRunApp from 'common-app/runtime-tests/self-tests/AutoRunApp';
import { AppRegistry } from 'react-native';

const RUNTIME_TESTS_APP_NAME = 'FabricExampleRuntimeTests';

AppRegistry.registerComponent(
  RUNTIME_TESTS_APP_NAME,
  () => SelfTestsAutoRunApp
);
