import LifecycleAutoRunApp from 'common-app/runtime-tests/lifecycle/AutoRunApp';
import { AppRegistry } from 'react-native';

const RUNTIME_TESTS_APP_NAME = 'FabricExampleRuntimeTests';

AppRegistry.registerComponent(
  RUNTIME_TESTS_APP_NAME,
  () => LifecycleAutoRunApp
);
