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
  getDynamicFeatureFlag as getDynamicFeatureFlagReanimated,
  getStaticFeatureFlag as getStaticFeatureFlagReanimated,
  setDynamicFeatureFlag as setDynamicFeatureFlagReanimated,
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
  return !!globalThis._WORKLETS_BUNDLE_MODE_ENABLED;
}

const staticFlagsReanimated = [
  'DISABLE_COMMIT_PAUSING_MECHANISM',
  'ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS',
  'IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS',
  'EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS',
  'IOS_CSS_CORE_ANIMATION',
  'USE_SYNCHRONIZABLE_FOR_MUTABLES',
  'USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS',
  'ENABLE_SHARED_ELEMENT_TRANSITIONS',
  'FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS',
  'USE_ANIMATION_BACKEND',
] as const;

const staticFlagsWorklets = [
  'FETCH_PREVIEW_ENABLED',
  'IOS_DYNAMIC_FRAMERATE_ENABLED',
  'ENABLE_CROSS_RUNTIME_STACK_TRACES',
] as const;

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
    setDynamicFeatureFlagReanimated(
      'EXAMPLE_DYNAMIC_FLAG',
      !getDynamicFeatureFlagReanimated('EXAMPLE_DYNAMIC_FLAG')
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
          <Text style={styles.sectionHeader}>Reanimated static flags</Text>
          {staticFlagsReanimated.map((name) => (
            <Item
              key={name}
              label={name}
              value={getStaticFeatureFlagReanimated(name)}
            />
          ))}
          <View style={styles.hr} />
          <Text style={styles.sectionHeader}>Worklets static flags</Text>
          {staticFlagsWorklets.map((name) => (
            <Item
              key={name}
              label={name}
              value={getStaticFeatureFlagWorklets(name)}
            />
          ))}
          <View style={styles.hr} />
          <Item
            label="EXAMPLE_DYNAMIC_FLAG"
            value={getDynamicFeatureFlagReanimated('EXAMPLE_DYNAMIC_FLAG')}
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
  hr: {
    height: 2,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 4,
    color: '#333',
  },
});
