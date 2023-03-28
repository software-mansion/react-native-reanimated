import { Platform, Text } from 'react-native';

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
    <>
      <Text>
        Platform: {getPlatform()} {getPlatformVersion()}
      </Text>
      <Text>Mode: {getMode()}</Text>
      {!isWeb() && (
        <>
          <Text>Architecture: {getArchitecture()}</Text>
          <Text>Runtime: {getRuntime()}</Text>
          <Text>React Native version: {getReactNativeVersion()}</Text>
        </>
      )}
    </>
  );
}
