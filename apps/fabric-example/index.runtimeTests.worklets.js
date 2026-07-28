import { AppRegistry } from 'react-native';
import WorkletsAutoRunApp from 'common-app/runtime-tests/worklets/AutoRunApp';

const RUNTIME_TESTS_APP_NAME = 'FabricExampleRuntimeTests';

AppRegistry.registerComponent(
  RUNTIME_TESTS_APP_NAME,
  () => WorkletsAutoRunApp
);
