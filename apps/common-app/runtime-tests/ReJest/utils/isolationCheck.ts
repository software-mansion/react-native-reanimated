import type { TestRunSummary } from '../types';

export const REANIMATED_ISOLATION_FAILURE =
  '[isolation] react-native-reanimated was loaded during a Worklets-only run';

export function applyIsolationCheck(
  summary: TestRunSummary,
  forbidReanimated: boolean
): TestRunSummary {
  if (!forbidReanimated || !isReanimatedLoaded()) {
    return summary;
  }
  return {
    ...summary,
    failed: summary.failed + 1,
    failedTests: [...summary.failedTests, REANIMATED_ISOLATION_FAILURE],
  };
}

function isReanimatedLoaded() {
  const globals = globalThis as {
    _REANIMATED_VERSION_JS?: unknown;
    __reanimatedLoggerConfig?: unknown;
  };
  return (
    globals._REANIMATED_VERSION_JS !== undefined ||
    globals.__reanimatedLoggerConfig !== undefined
  );
}
