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
  return __DEV__ ? 'Debug' : 'Release';
}

function getRuntime() {
  if ('HermesInternal' in global) {
    const version =
      // @ts-ignore this is fine
      global.HermesInternal?.getRuntimeProperties?.()['OSS Release Version'];
    return `Hermes (${version})`;
  }
  if ('_v8runtime' in global) {
    // @ts-ignore this is fine
    const version = global._v8runtime().version;
    return `V8 (${version})`;
  }
  return 'JSC';
}

function getArchitecture() {
  return 'nativeFabricUIManager' in global ? 'Fabric' : 'Paper';
}

function getReactNativeVersion() {
  const { major, minor, patch } = Platform.constants.reactNativeVersion;
  return `${major}.${minor}.${patch}`;
}

export default function AboutExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        <Text style={styles.bold}>Platform:</Text> {getPlatform()}{' '}
        {getPlatformVersion()}
      </Text>
      <Text style={styles.text}>
        <Text style={styles.bold}>Build type:</Text> {getMode()}
      </Text>
      {!isWeb() && (
        <>
          <Text style={styles.text}>
            <Text style={styles.bold}>Architecture:</Text> {getArchitecture()}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>JS runtime:</Text> {getRuntime()}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>RN version:</Text>{' '}
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
