/* eslint-disable @typescript-eslint/no-var-requires */
import { AppRegistry } from 'react-native';

import type { RuntimeTestSuite } from '../types';
import type { TestConfiguration, TestRunSummary } from './types';
import { setFullRun } from './utils/fullRun';
import { applyIsolationCheck } from './utils/isolationCheck';
import { runWithRemoteReporter } from './utils/remoteReporter';
import type { RenderLock } from './utils/RenderLock';
import { deriveWsUrl, setWsUrlOverride } from './utils/serverUrl';
import { declareSuites, selectSuitesToRun } from './utils/suiteSelection';

const HEADLESS_RUN_TASK_KEY = 'RuntimeTestsHeadlessRun';

interface HeadlessRuntimeTestsOptions {
  tests: RuntimeTestSuite[];
  library: string;
  forbidReanimated?: boolean;
}

interface HeadlessRunTaskData {
  wsUrl?: string;
}

/**
 * Registers the headless JS task that runs `tests` without a React root and
 * reports to the runtime tests server. `RuntimeTestsHeadlessTaskService` of
 * FabricExample starts it on Android.
 *
 * Like `AutoRunRuntimeTestsRunner`, this file must not statically import
 * `./RuntimeTestsApi` or anything else that pulls in react-native-reanimated.
 */
export function registerHeadlessRuntimeTests(
  options: HeadlessRuntimeTestsOptions
) {
  AppRegistry.registerHeadlessTask(
    HEADLESS_RUN_TASK_KEY,
    () => (data) =>
      runHeadlessRuntimeTests(options, data as HeadlessRunTaskData)
  );
}

function runHeadlessRuntimeTests(
  { tests, library, forbidReanimated }: HeadlessRuntimeTestsOptions,
  { wsUrl }: HeadlessRunTaskData
): Promise<void> {
  if (wsUrl) {
    setWsUrlOverride(wsUrl);
  }
  return new Promise((resolve) => {
    runWithRemoteReporter({
      wsUrl: deriveWsUrl(),
      library,
      declaredSuites: declareSuites(tests),
      onStatus: () => {},
      onFinished: resolve,
      onStart: async ({ only, full, reportSuiteFinished, requestReload }) => {
        setFullRun(!!full);
        const selected = selectSuitesToRun(tests, only, full);

        const { configure, importRuntimeTestSuite, runTests } =
          require('./RuntimeTestsApi') as {
            configure: (config: TestConfiguration) => RenderLock;
            importRuntimeTestSuite: (
              name: string,
              importTest: () => void
            ) => void;
            runTests: () => Promise<TestRunSummary>;
          };

        selected.forEach((test) =>
          importRuntimeTestSuite(test.testSuiteName, test.importTest)
        );
        let renderLock: RenderLock | null = null;
        renderLock = configure({
          render: () => renderLock?.unlock(),
          onProgress: () => {},
          onSuiteFinished: reportSuiteFinished,
          onReloadRequested: (resumeFromSuite, summarySoFar) =>
            requestReload(
              resumeFromSuite,
              applyIsolationCheck(summarySoFar, !!forbidReanimated)
            ),
        });
        return applyIsolationCheck(await runTests(), !!forbidReanimated);
      },
    });
  });
}
