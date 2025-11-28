import React, { useCallback, useReducer } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import {
  getDynamicFeatureFlag,
  getStaticFeatureFlag as getStaticFeatureFlagReanimated,
  setDynamicFeatureFlag,
} from 'react-native-reanimated';
import { getStaticFeatureFlag as getStaticFeatureFlagWorklets } from 'react-native-worklets';

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const version =
      // @ts-ignore this is fine
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      global.HermesInternal?.getRuntimeProperties?.()['OSS Release Version'];
    return `Hermes (${version})`;
  }
  return 'unknown';
}

function getArchitecture() {
  return 'nativeFabricUIManager' in global ? 'Fabric' : 'Paper';
}

function getReactNativeVersion() {
  const { major, minor, patch, prerelease } =
    Platform.constants.reactNativeVersion;
  return `${major}.${minor}.${patch}${prerelease ? `-${prerelease}` : ''}`;
}

export default function AboutExample() {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const handleToggleExampleDynamicFlag = useCallback(() => {
    setDynamicFeatureFlag(
      'EXAMPLE_DYNAMIC_FLAG',
      !getDynamicFeatureFlag('EXAMPLE_DYNAMIC_FLAG')
    );
    forceUpdate();
  }, [forceUpdate]);

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
            <Text style={styles.bold}>Bundle mode:</Text>{' '}
            {
              // @ts-expect-error This global is not exposed.
              globalThis._WORKLETS_BUNDLE_MODE ? 'Enabled' : 'Disabled'
            }
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>DISABLE_COMMIT_PAUSING_MECHANISM:</Text>{' '}
            {getStaticFeatureFlagReanimated('DISABLE_COMMIT_PAUSING_MECHANISM')
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>
              ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS:
            </Text>{' '}
            {getStaticFeatureFlagReanimated(
              'ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS'
            )
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS:</Text>{' '}
            {getStaticFeatureFlagReanimated('IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS')
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>
              EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS:
            </Text>{' '}
            {getStaticFeatureFlagReanimated(
              'EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS'
            )
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>USE_SYNCHRONIZABLE_FOR_MUTABLES:</Text>{' '}
            {getStaticFeatureFlagReanimated('USE_SYNCHRONIZABLE_FOR_MUTABLES')
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>
              USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS:
            </Text>{' '}
            {getStaticFeatureFlagReanimated(
              'USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS'
            )
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>
              FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS:
            </Text>{' '}
            {getStaticFeatureFlagReanimated(
              'FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS'
            )
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>IOS_DYNAMIC_FRAMERATE_ENABLED:</Text>{' '}
            {getStaticFeatureFlagWorklets('IOS_DYNAMIC_FRAMERATE_ENABLED')
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>EXAMPLE_DYNAMIC_FLAG:</Text>{' '}
            {getDynamicFeatureFlag('EXAMPLE_DYNAMIC_FLAG')
              ? 'Enabled'
              : 'Disabled'}
          </Text>
          <Button
            title={`Toggle EXAMPLE_DYNAMIC_FLAG`}
            onPress={handleToggleExampleDynamicFlag}
          />
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
