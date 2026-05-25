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
import { RUNTIME_TEST_SUITES } from './suites';

LogBox.ignoreLogs([
  "Deep imports from the 'react-native' package are deprecated",
]);

const DEFAULT_PORT = 8082;

interface SourceCodeConstants {
  scriptURL?: string;
}

function deriveWsUrl(): string {
  const override =
    (globalThis as { __RUNTIME_TESTS_WS_URL__?: string })
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
  if (scriptURL) {
    const match = /^https?:\/\/([^/:]+)(?::\d+)?\//.exec(scriptURL);
    if (match) {
      host = match[1];
    }
  } else if (Platform.OS === 'android') {
    host = '10.0.2.2';
  }

  return `ws://${host}:${DEFAULT_PORT}`;
}

export default function AutoRunRuntimeTestsApp() {
  const wsUrl = deriveWsUrl();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reanimated Runtime Tests</Text>
      <Text style={styles.subtitle}>WS server: {wsUrl}</Text>
      <View style={styles.runner}>
        <AutoRunRuntimeTestsRunner
          tests={RUNTIME_TEST_SUITES}
          autoRun={{ wsUrl }}
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
