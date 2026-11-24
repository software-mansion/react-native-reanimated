import type { ReactNode } from 'react';
import { memo, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AnimatedRef, SharedValue } from 'react-native-reanimated';
import Animated, {
  measure,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';

// Run under TSan. React Native writes shadow node wrappers on the JS thread,
// these tests read them on the UI thread (#11232).

const STRESS_DURATION_MS = 8000;
const BOX_COUNT = 24;
const SCROLL_BOX_COUNT = 12;

function useJSCommitEveryFrame() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let frame = requestAnimationFrame(function loop() {
      setTick((value) => value + 1);
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return tick;
}

// Each React commit relayouts the boxes while the UI thread measures them.
const MeasuredBox = memo(function MeasuredBox({
  index,
  onRef,
}: {
  index: number;
  onRef: (index: number, ref: AnimatedRef<View>) => void;
}) {
  const ref = useAnimatedRef<View>();
  useEffect(() => {
    onRef(index, ref);
  }, [index, onRef, ref]);
  return <View ref={ref} style={styles.measuredBox} />;
});

function MeasureStress({ framesOnUI }: { framesOnUI: SharedValue<number> }) {
  const tick = useJSCommitEveryFrame();
  const [refs] = useState<AnimatedRef<View>[]>(() => []);
  const [onRef] = useState(
    () => (index: number, ref: AnimatedRef<View>) => (refs[index] = ref)
  );
  const [boxRefs, setBoxRefs] = useState<AnimatedRef<View>[]>([]);

  useEffect(() => {
    // The refs are registered in child effects, which run first.
    setBoxRefs([...refs]);
  }, [refs]);

  useFrameCallback(() => {
    for (const ref of boxRefs) {
      measure(ref);
    }
    framesOnUI.value += 1;
  });

  return (
    <View style={styles.container}>
      <View style={{ height: 10 + (tick % 2) * 10 }} />
      {Array.from({ length: BOX_COUNT }, (_, index) => (
        <MeasuredBox key={index} index={index} onRef={onRef} />
      ))}
    </View>
  );
}

// Scrolling updates the ScrollView state, so each React commit clones the
// animated box while the UI thread updates its props.
const ScrollBox = memo(function ScrollBox({
  framesOnUI,
}: {
  framesOnUI: SharedValue<number>;
}) {
  const scrollRef = useAnimatedRef<ScrollView>();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.5, { duration: 200 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useFrameCallback((frameInfo) => {
    scrollTo(scrollRef, (frameInfo.timeSinceFirstFrame / 4) % 200, 0, false);
    framesOnUI.value += 1;
  });

  return (
    <Animated.View style={[styles.scrollBox, animatedStyle]}>
      <Animated.ScrollView ref={scrollRef} horizontal>
        <View style={styles.scrollContent}>
          <Text>scroll</Text>
        </View>
      </Animated.ScrollView>
    </Animated.View>
  );
});

function ScrollStress({ framesOnUI }: { framesOnUI: SharedValue<number> }) {
  const tick = useJSCommitEveryFrame();
  return (
    <View style={styles.container}>
      <View style={{ height: 10 + (tick % 2) * 10 }} />
      {Array.from({ length: SCROLL_BOX_COUNT }, (_, index) => (
        <ScrollBox key={index} framesOnUI={framesOnUI} />
      ))}
    </View>
  );
}

function FramesCounter({
  children,
  onFramesOnUI,
}: {
  children: (framesOnUI: SharedValue<number>) => ReactNode;
  onFramesOnUI: (framesOnUI: SharedValue<number>) => void;
}) {
  const framesOnUI = useSharedValue(0);
  useEffect(() => {
    onFramesOnUI(framesOnUI);
  }, [framesOnUI, onFramesOnUI]);
  return <>{children(framesOnUI)}</>;
}

async function runStress(
  build: (framesOnUI: SharedValue<number>) => ReactNode
) {
  let framesOnUI: SharedValue<number> | null = null;
  await render(
    <FramesCounter onFramesOnUI={(value) => (framesOnUI = value)}>
      {build}
    </FramesCounter>
  );
  await wait(STRESS_DURATION_MS);
  const frames = framesOnUI!.value;
  await render(null);
  return frames;
}

describe('shadow node wrapper race (#11232)', () => {
  test('measure on the UI thread while React relayouts the views', async () => {
    const frames = await runStress((framesOnUI) => (
      <MeasureStress framesOnUI={framesOnUI} />
    ));
    expect(frames > 0).toBe(true);
  });

  test('animated style and scrollTo on the UI thread while React progresses state', async () => {
    const frames = await runStress((framesOnUI) => (
      <ScrollStress framesOnUI={framesOnUI} />
    ));
    expect(frames > 0).toBe(true);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  measuredBox: {
    width: 40,
    height: 10,
    margin: 1,
    backgroundColor: 'teal',
  },
  scrollBox: {
    height: 30,
    margin: 1,
    backgroundColor: 'orange',
  },
  scrollContent: {
    width: 600,
    height: 30,
  },
});
