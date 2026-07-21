/* eslint-disable @typescript-eslint/no-var-requires */
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RuntimeTestSuite } from '../types';
import { runWithRemoteReporter } from './utils/remoteReporter';
import { RenderLock } from './utils/SyncUIRunner';

// IMPORTANT: do not statically import `./RuntimeTestsApi` or anything else that pulls in
// react-native-reanimated. The framework is loaded lazily once the host sends `start`, so
// a Worklets-only run never loads reanimated at all — the Reanimated entry point preloads
// it explicitly at boot instead.
//
// `RenderLock` and `runWithRemoteReporter` are safe — they depend on
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
}

interface ProgressState {
  current: number;
  total: number;
  currentName: string;
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

export default function AutoRunRuntimeTestsRunner({
  tests,
  autoRun,
  library,
  forbidReanimated,
}: AutoRunRuntimeTestsRunnerProps) {
  const [component, setComponent] = useState<ReactNode | null>(null);
  const [status, setStatus] = useState<string>(
    `Connecting to ${autoRun.wsUrl}…`
  );
  const [progress, setProgress] = useState<ProgressState | null>(null);

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
      onStart: async ({ only }) => {
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

        if (filterSet) {
          const known = new Set(tests.map((test) => test.testSuiteName));
          const unknown = [...filterSet].filter((name) => !known.has(name));
          if (unknown.length > 0) {
            throw new Error(`Unknown test suites: ${unknown.join(', ')}`);
          }
        }

        const { configure, runTests } = require('./RuntimeTestsApi') as {
          configure: (config: {
            render: (renderedComponent: ReactNode) => void;
            onProgress?: (progressState: ProgressState) => void;
          }) => RenderLock;
          runTests: () => Promise<{
            passed: number;
            failed: number;
            skipped: number;
            failedTests: string[];
            durationMs: number;
          }>;
        };

        selected.forEach((test) => test.importTest());
        renderLock = configure({
          render: setComponent,
          onProgress: setProgress,
        });
        const summary = await runTests();
        if (forbidReanimated && isReanimatedLoaded()) {
          summary.failed += 1;
          summary.failedTests.push(
            '[isolation] react-native-reanimated was loaded during a Worklets-only run'
          );
        }
        return summary;
      },
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [autoRun.wsUrl, tests, library, forbidReanimated]);

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
