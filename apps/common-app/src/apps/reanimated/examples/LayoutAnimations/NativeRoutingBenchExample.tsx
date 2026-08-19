import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  runOnJS,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Native IR routing bench (Objective 07). Each scenario runs one production
// layout animation through the routing order. A Debug example app with
// IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION on prints one RouteDecision trace line
// for each start: selectedRoute=0 is direct basic, selectedRoute=3 is
// frame-driven with its typed build failure. With the flag off every scenario
// runs frame-driven.

type ScenarioName =
  | 'direct-basic'
  | 'sampled-candidate'
  | 'frame-driven-spring'
  | 'mixed-unsupported';

type CallbackRecord = {
  count: number;
  lastFinished: string;
};

const SCENARIOS: ScenarioName[] = [
  'direct-basic',
  'sampled-candidate',
  'frame-driven-spring',
  'mixed-unsupported',
];

const EXPECTED_ROUTES: Record<ScenarioName, string> = {
  'direct-basic': 'native (direct basic)',
  'sampled-candidate': 'frame-driven (UnsupportedTiming until Objective 12)',
  'frame-driven-spring': 'frame-driven (UnsupportedTrackForm)',
  'mixed-unsupported': 'frame-driven (whole animation, UnsupportedTarget)',
};

function makeScenario(
  name: ScenarioName,
  recordCallback: (finished: boolean) => void
): LayoutAnimationFunction {
  return (values) => {
    'worklet';
    const callback = (finished: boolean) => {
      'worklet';
      runOnJS(recordCallback)(finished);
    };
    switch (name) {
      case 'direct-basic':
        return {
          initialValues: {
            originX: values.currentOriginX,
            originY: values.currentOriginY,
          },
          animations: {
            originX: withTiming(values.targetOriginX, {
              duration: 1500,
              easing: Easing.linear,
            }),
            originY: withDelay(
              200,
              withTiming(values.targetOriginY, {
                duration: 1300,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
              })
            ),
          },
          callback,
        };
      case 'sampled-candidate':
        // A deterministic curve without common timing data; Objective 12 adds
        // its sampled route.
        return {
          initialValues: { originX: values.currentOriginX },
          animations: {
            originX: withTiming(values.targetOriginX, {
              duration: 1500,
              easing: Easing.bounce,
            }),
          },
          callback,
        };
      case 'frame-driven-spring':
        return {
          initialValues: { originX: values.currentOriginX },
          animations: {
            originX: withSequence(
              withSpring(values.targetOriginX, { damping: 12, stiffness: 120 })
            ),
          },
          callback,
        };
      case 'mixed-unsupported':
        // One unsupported required track keeps the whole animation
        // frame-driven.
        return {
          initialValues: {
            originX: values.currentOriginX,
            width: values.currentWidth,
          },
          animations: {
            originX: withTiming(values.targetOriginX, {
              duration: 1500,
              easing: Easing.linear,
            }),
            width: withTiming(values.targetWidth, {
              duration: 1500,
              easing: Easing.linear,
            }),
          },
          callback,
        };
    }
  };
}

export default function NativeRoutingBenchExample() {
  const [scenario, setScenario] = useState<ScenarioName>('direct-basic');
  const [moved, setMoved] = useState(false);
  const [callbackRecord, setCallbackRecord] = useState<CallbackRecord>({
    count: 0,
    lastFinished: 'none',
  });

  const recordCallback = (finished: boolean) => {
    setCallbackRecord((previous) => ({
      count: previous.count + 1,
      lastFinished: String(finished),
    }));
  };

  const backend = getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION')
    ? 'native routing on'
    : 'frame-driven only';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Native IR routing bench (Objective 07)</Text>
      <Text style={styles.label}>Compiled backend: {backend}</Text>
      {SCENARIOS.map((name) => (
        <Button
          key={name}
          title={`${name === scenario ? '● ' : ''}${name}`}
          onPress={() => {
            setScenario(name);
            setMoved(false);
            setCallbackRecord({ count: 0, lastFinished: 'none' });
          }}
        />
      ))}
      <Text style={styles.label}>
        Expected route: {EXPECTED_ROUTES[scenario]}
      </Text>
      <Button
        title="Run layout animation"
        onPress={() => setMoved((previous) => !previous)}
      />
      <View style={styles.arena}>
        <Animated.View
          key={scenario}
          layout={makeScenario(scenario, recordCallback)}
          testID="routing-bench-box"
          style={[
            styles.box,
            moved ? styles.boxMoved : null,
            scenario === 'mixed-unsupported' && moved ? styles.boxWide : null,
          ]}>
          <Text style={styles.boxLabel}>{scenario}</Text>
        </Animated.View>
      </View>
      <Text style={styles.label}>
        Callback count: {callbackRecord.count}, last finished:{' '}
        {callbackRecord.lastFinished}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
  },
  arena: {
    height: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'gray',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  box: {
    width: 120,
    height: 60,
    backgroundColor: 'navy',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxMoved: {
    marginLeft: 200,
    marginTop: 100,
  },
  boxWide: {
    width: 160,
  },
  boxLabel: {
    color: 'white',
    fontSize: 12,
  },
});
