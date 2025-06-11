import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

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

function getBundle() {
  return __DEV__ ? 'dev' : 'production';
}

function getRuntime() {
  if ('HermesInternal' in global) {
    const version =
      // @ts-ignore this is fine
      global.HermesInternal?.getRuntimeProperties?.()['OSS Release Version'];
    return `Hermes (${version})`;
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
        <Text style={styles.bold}>Bundle:</Text> {getBundle()}
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
          <Text style={styles.text}>
            <Text style={styles.bold}>Experimental bundling:</Text>{' '}
            {
              // @ts-expect-error This global is not exposed.
              globalThis._WORKLETS_EXPERIMENTAL_BUNDLING
                ? 'Enabled'
                : 'Disabled'
            }
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
