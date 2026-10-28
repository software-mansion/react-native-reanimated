import WorkletsAutoRunApp from 'common-app/runtime-tests/worklets/AutoRunApp';
import { WORKLETS_TEST_SUITES } from 'common-app/runtime-tests/worklets/suites';
import { AppRegistry, Platform } from 'react-native';

WORKLETS_TEST_SUITES.push({
  testSuiteName: 'C++ docs integration',
  importTest: () => require('./runtime-tests/nativeExample.test'),
  disabled: Platform.OS !== 'ios',
});

const RUNTIME_TESTS_APP_NAME = 'FabricExampleRuntimeTests';

AppRegistry.registerComponent(RUNTIME_TESTS_APP_NAME, () => WorkletsAutoRunApp);
