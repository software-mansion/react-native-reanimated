import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { runWithRemoteReporter } from './utils/remoteReporter';
import { RenderLock } from './utils/SyncUIRunner';

// IMPORTANT: do not statically import `./RuntimeTestsApi` or anything else that pulls in
// react-native-reanimated. The framework is loaded lazily once the host sends `start`, so
// the app shell never registers reanimated's commit hook.
//
// `RenderLock` and `runWithRemoteReporter` are safe — they depend on
// `react-native-worklets` / `react-native` only, no reanimated.

let renderLock: RenderLock = new RenderLock();

export interface AutoRunConfig {
  wsUrl: string;
}

interface SuiteData {
  testSuiteName: string;
  importTest: () => void;
  skipByDefault?: boolean;
  disabled?: boolean;
}

interface AutoRunRuntimeTestsRunnerProps {
  tests: SuiteData[];
  autoRun: AutoRunConfig;
}

export default function AutoRunRuntimeTestsRunner({
  tests,
  autoRun,
}: AutoRunRuntimeTestsRunnerProps) {
  const [component, setComponent] = useState<ReactNode | null>(null);
  const [status, setStatus] = useState<string>(
    `Connecting to ${autoRun.wsUrl}…`
  );

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

        // Lazy-load the framework now. This is the first point reanimated enters the
        // JS bundle, by which time the WebSocket is connected and a `start` was received.
        const { configure, runTests } = require('./RuntimeTestsApi') as {
          configure: (config: {
            render: (component: ReactNode) => void;
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
        renderLock = configure({ render: setComponent });
        return runTests();
      },
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [autoRun.wsUrl, tests]);

  return (
    <View style={styles.flexOne}>
      <Text style={styles.statusText}>{status}</Text>
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
});
