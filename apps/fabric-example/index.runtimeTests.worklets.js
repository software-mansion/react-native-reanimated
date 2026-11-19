import { registerHeadlessRuntimeTests } from 'common-app/runtime-tests/ReJest/HeadlessRuntimeTestsRunner';
import WorkletsAutoRunApp from 'common-app/runtime-tests/worklets/AutoRunApp';
import { WORKLETS_HEADLESS_TEST_SUITES } from 'common-app/runtime-tests/worklets/headlessSuites';
import { AppRegistry } from 'react-native';

const RUNTIME_TESTS_APP_NAME = 'FabricExampleRuntimeTests';

AppRegistry.registerComponent(RUNTIME_TESTS_APP_NAME, () => WorkletsAutoRunApp);
registerHeadlessRuntimeTests({
  tests: WORKLETS_HEADLESS_TEST_SUITES,
  library: 'Worklets',
  forbidReanimated: true,
});
