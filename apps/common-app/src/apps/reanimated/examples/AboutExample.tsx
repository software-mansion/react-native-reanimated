import React, { useCallback, useReducer } from 'react';
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

const staticFlagsReanimated = [
  'DISABLE_COMMIT_PAUSING_MECHANISM',
  'ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS',
  'IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS',
  'EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS',
  'USE_SYNCHRONIZABLE_FOR_MUTABLES',
  'USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS',
  'ENABLE_SHARED_ELEMENT_TRANSITIONS',
  'FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS',
] as const;

const staticFlagsWorklets = ['IOS_DYNAMIC_FRAMERATE_ENABLED'] as const;

interface ItemProps {
  label: string;
  value: string | boolean;
}

function Item({ label, value }: ItemProps) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value === true ? (
          <Text style={styles.true}>✅ true</Text>
        ) : value === false ? (
          <Text style={styles.false}>❌ false</Text>
        ) : (
          value
        )}
      </Text>
    </View>
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
    <ScrollView contentContainerStyle={styles.container}>
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
          {staticFlagsReanimated.map((name) => (
            <Item
              key={name}
              label={name}
              value={getStaticFeatureFlagReanimated(name)}
            />
          ))}
          {staticFlagsWorklets.map((name) => (
            <Item
              key={name}
              label={name}
              value={getStaticFeatureFlagWorklets(name)}
            />
          ))}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  item: {
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'gray',
  },
  label: {
    fontSize: 12,
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
  },
  true: {
    color: 'green',
  },
  false: {
    color: 'firebrick',
  },
});
