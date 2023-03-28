import { Platform, StyleSheet, Text, View } from 'react-native';

import React from 'react';

function isWeb() {
  return Platform.OS === 'web';
}

function getPlatform() {
  if (isWeb()) {
    return 'web';
  }
  // @ts-ignore it works
  return Platform.constants.systemName || Platform.constants.Brand;
}

function getPlatformVersion() {
  return Platform.Version;
}

function getMode() {
  return __DEV__ ? 'debug' : 'release';
}

function getRuntime() {
  return 'HermesInternal' in global ? 'Hermes' : 'JSC'; // TODO: V8
}

function getArchitecture() {
  return 'nativeFabricUIManager' in global ? 'Fabric' : 'Paper';
}

function getReactNativeVersion() {
  const { major, minor, patch } = Platform.constants.reactNativeVersion;
  return `${major}.${minor}.${patch}`;
}

export default function ConfigExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        <Text style={styles.bold}>Platform:</Text> {getPlatform()}{' '}
        {getPlatformVersion()}
      </Text>
      <Text style={styles.text}>
        <Text style={styles.bold}>Mode:</Text> {getMode()}
      </Text>
      {!isWeb() && (
        <>
          <Text style={styles.text}>
            <Text style={styles.bold}>Architecture:</Text> {getArchitecture()}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Runtime:</Text> {getRuntime()}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>React Native version:</Text>{' '}
            {getReactNativeVersion()}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
});
