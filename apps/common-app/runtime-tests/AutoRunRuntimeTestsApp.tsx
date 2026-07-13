import React from 'react';
import {
  LogBox,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AutoRunRuntimeTestsRunner from './ReJest/AutoRunRuntimeTestsRunner';
import type { RuntimeTestSuite } from './types';

LogBox.ignoreLogs([
  "Deep imports from the 'react-native' package are deprecated",
]);

const DEFAULT_PORT = 8082;

interface SourceCodeConstants {
  scriptURL?: string;
}

// The host server listens on the Metro port + 1 by default, so the WebSocket
// port never collides with Metro itself regardless of which port Metro uses.
function deriveWsUrl(): string {
  const override = (globalThis as { __RUNTIME_TESTS_WS_URL__?: string })
    .__RUNTIME_TESTS_WS_URL__;
  if (override) {
    return override;
  }

  const scriptURL: string | undefined = (
    NativeModules.SourceCode?.getConstants?.() as
      | SourceCodeConstants
      | undefined
  )?.scriptURL;

  // Simulator fallback — localhost.
  let host = 'localhost';
  let port = DEFAULT_PORT;
  if (scriptURL) {
    const match = /^https?:\/\/([^/:]+)(?::(\d+))?\//.exec(scriptURL);
    if (match) {
      host = match[1];
      if (match[2]) {
        port = Number(match[2]) + 1;
      }
    }
  } else if (Platform.OS === 'android') {
    host = '10.0.2.2';
  }

  return `ws://${host}:${port}`;
}

interface AutoRunRuntimeTestsAppProps {
  tests: RuntimeTestSuite[];
  library: string;
  forbidReanimated?: boolean;
}

export default function AutoRunRuntimeTestsApp({
  tests,
  library,
  forbidReanimated,
}: AutoRunRuntimeTestsAppProps) {
  const wsUrl = deriveWsUrl();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{library} Runtime Tests</Text>
      <Text style={styles.subtitle}>WS server: {wsUrl}</Text>
      <View style={styles.runner}>
        <AutoRunRuntimeTestsRunner
          tests={tests}
          autoRun={{ wsUrl }}
          library={library}
          forbidReanimated={forbidReanimated}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: 'navy',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: 'gray',
    marginBottom: 8,
  },
  runner: {
    flex: 1,
  },
});
