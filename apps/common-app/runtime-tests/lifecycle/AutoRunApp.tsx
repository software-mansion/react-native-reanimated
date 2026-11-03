import './scenarios';

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { deriveWsUrl } from '../ReJest/utils/serverUrl';
import { connectToLifecycleServer } from './lifecycleClient';

export default function LifecycleAutoRunApp() {
  const wsUrl = deriveWsUrl();
  const [status, setStatus] = useState(`Connecting to ${wsUrl}…`);

  useEffect(() => connectToLifecycleServer(wsUrl, setStatus), [wsUrl]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lifecycle Runtime Tests</Text>
      <Text style={styles.subtitle}>WS server: {wsUrl}</Text>
      <Text style={styles.status}>{status}</Text>
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
  status: {
    fontSize: 14,
    color: 'navy',
    alignSelf: 'center',
    paddingVertical: 6,
  },
});
