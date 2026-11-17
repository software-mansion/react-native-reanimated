import React from 'react';
import { LogBox, StyleSheet, Text, View } from 'react-native';

import AutoRunRuntimeTestsRunner from './ReJest/AutoRunRuntimeTestsRunner';
import { deriveWsUrl, setWsUrlOverride } from './ReJest/utils/serverUrl';
import type { RuntimeTestSuite } from './types';

LogBox.ignoreLogs([
  "Deep imports from the 'react-native' package are deprecated",
]);

/** Initial properties the native app passes from its launch settings. */
export interface AutoRunRootProps {
  wsUrl?: string;
}

interface AutoRunRuntimeTestsAppProps extends AutoRunRootProps {
  tests: RuntimeTestSuite[];
  library: string;
  forbidReanimated?: boolean;
  warmUp?: () => Promise<void>;
}

export default function AutoRunRuntimeTestsApp({
  tests,
  library,
  forbidReanimated,
  warmUp,
  wsUrl: wsUrlOverride,
}: AutoRunRuntimeTestsAppProps) {
  if (wsUrlOverride) {
    setWsUrlOverride(wsUrlOverride);
  }
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
          warmUp={warmUp}
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
