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
  if ('HermesInternal' in globalThis) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const version =
      // @ts-ignore this is fine
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      globalThis.HermesInternal?.getRuntimeProperties?.()[
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'OSS Release Version'
      ];
    return `Hermes (${version})`;
  }
  return 'unknown';
}

function getArchitecture() {
  return 'nativeFabricUIManager' in globalThis
    ? 'New Architecture'
    : 'Legacy Architecture';
}

function getReactNativeVersion() {
  const { major, minor, patch, prerelease } =
    Platform.constants.reactNativeVersion;
  return `${major}.${minor}.${patch}${prerelease ? `-${prerelease}` : ''}`;
}

function isBundleModeEnabled() {
  return '_WORKLETS_BUNDLE_MODE' in globalThis;
}

interface ItemProps {
  label: string;
  value: string | boolean;
}

function Item({ label, value }: ItemProps) {
  return (
    <Text style={styles.text}>
      <Text style={styles.bold}>{label}:</Text>{' '}
      {value === true ? 'Enabled' : value === false ? 'Disabled' : value}
    </Text>
  );
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
      <Item
        label="Platform"
        value={`${getPlatform()} ${getPlatformVersion()}`}
      />
      <Item label="Bundle" value={getBundle()} />
      {!isWeb() && (
        <>
          <Item label="Architecture" value={getArchitecture()} />
          <Item label="JS runtime" value={getRuntime()} />
          <Item label="RN version" value={getReactNativeVersion()} />
          <Item label="Bundle mode" value={isBundleModeEnabled()} />
          <Item
            label="DISABLE_COMMIT_PAUSING_MECHANISM"
            value={getStaticFeatureFlagReanimated(
              'DISABLE_COMMIT_PAUSING_MECHANISM'
            )}
          />
          <Item
            label="ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS"
            value={getStaticFeatureFlagReanimated(
              'ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS'
            )}
          />
          <Item
            label="IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS"
            value={getStaticFeatureFlagReanimated(
              'IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS'
            )}
          />
          <Item
            label="EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS"
            value={getStaticFeatureFlagReanimated(
              'EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS'
            )}
          />
          <Item
            label="USE_SYNCHRONIZABLE_FOR_MUTABLES"
            value={getStaticFeatureFlagReanimated(
              'USE_SYNCHRONIZABLE_FOR_MUTABLES'
            )}
          />
          <Item
            label="USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS"
            value={getStaticFeatureFlagReanimated(
              'USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS'
            )}
          />
          <Item
            label="FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS"
            value={getStaticFeatureFlagReanimated(
              'FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS'
            )}
          />
          <Item
            label="IOS_DYNAMIC_FRAMERATE_ENABLED"
            value={getStaticFeatureFlagWorklets(
              'IOS_DYNAMIC_FRAMERATE_ENABLED'
            )}
          />
          <Item
            label="EXAMPLE_DYNAMIC_FLAG"
            value={getDynamicFeatureFlag('EXAMPLE_DYNAMIC_FLAG')}
          />
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
