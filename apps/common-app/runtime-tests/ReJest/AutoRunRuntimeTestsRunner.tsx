/* eslint-disable @typescript-eslint/no-var-requires */
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RuntimeTestSuite } from '../types';
import type { TestConfiguration, TestProgress, TestRunSummary } from './types';
import { applyIsolationCheck } from './utils/isolationCheck';
import { runWithRemoteReporter } from './utils/remoteReporter';
import { RenderLock } from './utils/RenderLock';

// IMPORTANT: do not statically import `./RuntimeTestsApi` or anything else that pulls in
// react-native-reanimated. The framework is loaded lazily once the host sends `start`, so
// a Worklets-only run never loads reanimated at all — the Reanimated entry point preloads
// it explicitly at boot instead.
//
// `RenderLock`, `runWithRemoteReporter` and `applyIsolationCheck` are safe — they depend on
// `react-native-worklets` / `react-native` only, no reanimated.

let renderLock: RenderLock = new RenderLock();

export interface AutoRunConfig {
  wsUrl: string;
}

interface AutoRunRuntimeTestsRunnerProps {
  tests: RuntimeTestSuite[];
  autoRun: AutoRunConfig;
  library: string;
  forbidReanimated?: boolean;
  warmUp?: () => Promise<void>;
}

export default function AutoRunRuntimeTestsRunner({
  tests,
  autoRun,
  library,
  forbidReanimated,
  warmUp,
}: AutoRunRuntimeTestsRunnerProps) {
  const [component, setComponent] = useState<ReactNode | null>(null);
  const [status, setStatus] = useState<string>(
    `Connecting to ${autoRun.wsUrl}…`
  );
  const [progress, setProgress] = useState<TestProgress | null>(null);

  useEffect(() => {
    if (renderLock) {
      renderLock.unlock();
    }
  }, [component]);

  useEffect(() => {
    let cancelled = false;

    const declaredSuites = tests.map((test) => ({
      name: test.testSuiteName,
      skipByDefault: !!test.skipByDefault,
      disabled: !!test.disabled,
    }));

    const teardown = runWithRemoteReporter({
      wsUrl: autoRun.wsUrl,
      library,
      declaredSuites,
      onStatus: (message) => {
        if (!cancelled) {
          setStatus(message);
        }
      },
      onStart: async ({ only, reportSuiteFinished, requestReload }) => {
        const filterSet = only ? new Set(only) : null;
        const selected = tests.filter((test) => {
          if (test.disabled) {
            return false;
          }
          if (filterSet) {
            return filterSet.has(test.testSuiteName);
          }
          return !test.skipByDefault;
        });

        const known = new Set(tests.map((test) => test.testSuiteName));
        const unknown = [...(filterSet ?? [])].filter(
          (name) => !known.has(name)
        );
        if (unknown.length > 0) {
          throw new Error(`Unknown test suites: ${unknown.join(', ')}`);
        }

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
        renderLock = configure({
          render: setComponent,
          onProgress: setProgress,
          onSuiteFinished: reportSuiteFinished,
          onReloadRequested: (resumeFromSuite, summarySoFar) =>
            requestReload(
              resumeFromSuite,
              applyIsolationCheck(summarySoFar, !!forbidReanimated)
            ),
        });
        if (warmUp) {
          await warmUp();
        }
        return applyIsolationCheck(await runTests(), !!forbidReanimated);
      },
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [autoRun.wsUrl, tests, library, forbidReanimated, warmUp]);

  return (
    <View style={styles.flexOne}>
      <Text style={styles.statusText}>{status}</Text>
      {progress ? (
        <View style={styles.progressBlock}>
          <Text style={styles.progressCount}>
            Running test {progress.current} of {progress.total}
          </Text>
          <Text style={styles.progressName} numberOfLines={2}>
            {progress.currentName}
          </Text>
        </View>
      ) : null}
      {component || null}
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    flexDirection: 'column',
  },
  statusText: {
    fontSize: 14,
    color: 'navy',
    alignSelf: 'center',
    paddingVertical: 6,
  },
  progressBlock: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '600',
    color: 'navy',
    textAlign: 'center',
  },
  progressName: {
    fontSize: 12,
    color: 'gray',
    textAlign: 'center',
    marginTop: 2,
  },
});
