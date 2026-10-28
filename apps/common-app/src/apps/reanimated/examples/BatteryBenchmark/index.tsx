/**
 * Battery benchmark: renders one animation scenario at a time so its energy
 * cost can be measured on a device.
 *
 * Scenarios can be selected in the UI or with a deep link (Android):
 *
 *     adb shell am start -a android.intent.action.VIEW \
 *       -d 'fabricexample://Reanimated/BatteryBenchmarkExample?scenario=uas-transform&count=100'
 */
import { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SCENARIOS } from './scenarios';

const COUNTS = [1, 10, 100, 300];
const DEFAULT_COUNT = 100;

function parseUrl(url: string | null | undefined) {
  const query = url?.split('?')[1];
  if (!query) {
    return null;
  }
  const params = Object.fromEntries(
    query.split('&').map((pair) => pair.split('=').map(decodeURIComponent))
  ) as Record<string, string | undefined>;
  return {
    scenario: params.scenario,
    count: params.count ? Number(params.count) : undefined,
  };
}

export default function BatteryBenchmarkExample() {
  const [scenario, setScenario] = useState('empty');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [showPicker, setShowPicker] = useState(true);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    const apply = (url: string | null | undefined) => {
      const parsed = parseUrl(url);
      if (!parsed) {
        return;
      }
      if (parsed.scenario && parsed.scenario in SCENARIOS) {
        setScenario(parsed.scenario);
        // Deep-linked runs are measurements: hide the picker so the screen
        // content does not depend on the scenario list.
        setShowPicker(false);
      }
      if (parsed.count) {
        setCount(parsed.count);
      }
    };
    Linking.getInitialURL()
      .then(apply)
      .catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) =>
      apply(url)
    );
    return () => subscription.remove();
  }, []);

  const { component: Component, ownContainer } = SCENARIOS[scenario];
  // Boxes take about a third of the area, the rest is margin.
  const size = Math.max(
    4,
    Math.floor(Math.sqrt((width * height * 0.6) / count) / 1.5)
  );

  return (
    <View style={styles.container}>
      <Pressable onLongPress={() => setShowPicker((v) => !v)}>
        <Text style={styles.title}>
          {scenario} × {count}
        </Text>
      </Pressable>
      {showPicker && (
        <View style={styles.picker}>
          <ScrollView horizontal>
            {COUNTS.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, c === count && styles.chipActive]}
                onPress={() => setCount(c)}>
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal>
            {Object.keys(SCENARIOS).map((name) => (
              <Pressable
                key={name}
                style={[styles.chip, name === scenario && styles.chipActive]}
                onPress={() => setScenario(name)}>
                <Text style={styles.chipText}>{name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {ownContainer ? (
        <Component count={count} key={`${scenario}-${count}`} size={size} />
      ) : (
        <View style={styles.grid}>
          <Component count={count} key={`${scenario}-${count}`} size={size} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  title: {
    color: '#888',
    padding: 4,
    fontSize: 12,
  },
  picker: {
    gap: 4,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    borderRadius: 4,
    backgroundColor: '#222',
  },
  chipActive: {
    backgroundColor: '#446',
  },
  chipText: {
    color: 'white',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
