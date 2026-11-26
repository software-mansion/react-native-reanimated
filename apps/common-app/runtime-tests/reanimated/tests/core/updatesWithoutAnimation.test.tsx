import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  wait,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const BOX_REF = 'UPDATES_WITHOUT_ANIMATION_BOX';
const DERIVED_BOX_REF = 'UPDATES_WITHOUT_ANIMATION_DERIVED_BOX';
const REACTION_NOTIFICATION = 'UPDATES_WITHOUT_ANIMATION_REACTION';
const FRAMES_NOTIFICATION = 'UPDATES_WITHOUT_ANIMATION_FRAMES';
const IDLE_MS = 300;
const INITIAL_WIDTH = 100;
const UPDATED_WIDTH = 200;
const DERIVED_FACTOR = 1.5;

let widthValue: SharedValue<number> | null = null;
let lastReactionValue = -1;

function onReaction(value: number) {
  lastReactionValue = value;
  notify(REACTION_NOTIFICATION);
}

async function renderIdleBoxes() {
  widthValue = null;
  lastReactionValue = -1;
  await render(<Boxes />);
  const box = getTestComponent(BOX_REF);
  await expectEventually(() => box.getAnimatedStyle('width')).toBe(
    INITIAL_WIDTH,
    ComparisonMode.PIXEL
  );
  await wait(IDLE_MS);
  return box;
}

describe('shared value updates without a running animation', () => {
  test('applies a write from the RN Runtime to the animated style', async () => {
    const box = await renderIdleBoxes();

    widthValue!.value = UPDATED_WIDTH;

    await expectEventually(() => box.getAnimatedStyle('width')).toBe(
      UPDATED_WIDTH,
      ComparisonMode.PIXEL
    );
  });

  test('applies a write from the UI Runtime to the animated style', async () => {
    const box = await renderIdleBoxes();
    const width = widthValue!;

    scheduleOnUI(() => {
      'worklet';
      width.value = UPDATED_WIDTH;
    });

    await expectEventually(() => box.getAnimatedStyle('width')).toBe(
      UPDATED_WIDTH,
      ComparisonMode.PIXEL
    );
  });

  test('applies the last of several writes made in a row', async () => {
    const box = await renderIdleBoxes();

    widthValue!.value = UPDATED_WIDTH - 50;
    widthValue!.value = UPDATED_WIDTH - 25;
    widthValue!.value = UPDATED_WIDTH;

    await expectEventually(() => box.getAnimatedStyle('width')).toBe(
      UPDATED_WIDTH,
      ComparisonMode.PIXEL
    );
  });

  test('recomputes a derived value and the style that reads it', async () => {
    await renderIdleBoxes();
    const derivedBox = getTestComponent(DERIVED_BOX_REF);

    widthValue!.value = UPDATED_WIDTH;

    await expectEventually(() => derivedBox.getAnimatedStyle('width')).toBe(
      UPDATED_WIDTH * DERIVED_FACTOR,
      ComparisonMode.PIXEL
    );
  });

  test('runs an animated reaction', async () => {
    await renderIdleBoxes();

    widthValue!.value = UPDATED_WIDTH;

    await waitForNotification(REACTION_NOTIFICATION);
    expect(lastReactionValue).toBe(UPDATED_WIDTH);
  });

  test('runs animation frame callbacks once per frame while values are written', async () => {
    const FRAME_COUNT = 10;
    const box = await renderIdleBoxes();
    let timestamps: number[] = [];
    const onDone = (recorded: number[]) => {
      timestamps = recorded;
      notify(FRAMES_NOTIFICATION);
    };

    scheduleOnUI(() => {
      'worklet';
      const recorded: number[] = [];
      const onFrame = (timestamp: number) => {
        recorded.push(timestamp);
        if (recorded.length < FRAME_COUNT) {
          requestAnimationFrame(onFrame);
        } else {
          scheduleOnRN(onDone, recorded);
        }
      };
      requestAnimationFrame(onFrame);
    });
    for (let step = 1; step <= FRAME_COUNT * 2; step++) {
      widthValue!.value = INITIAL_WIDTH + step;
      await wait(8);
    }
    widthValue!.value = UPDATED_WIDTH;

    await waitForNotification(FRAMES_NOTIFICATION);
    expect(timestamps.length).toBe(FRAME_COUNT);
    expect(new Set(timestamps).size).toBe(FRAME_COUNT);
    await expectEventually(() => box.getAnimatedStyle('width')).toBe(
      UPDATED_WIDTH,
      ComparisonMode.PIXEL
    );
  });
});

function Boxes() {
  const width = useSharedValue(INITIAL_WIDTH);
  widthValue = width;
  const boxRef = useTestRef(BOX_REF);
  const derivedBoxRef = useTestRef(DERIVED_BOX_REF);
  const derivedWidth = useDerivedValue(() => width.value * DERIVED_FACTOR);
  const boxStyle = useAnimatedStyle(() => ({ width: width.value }));
  const derivedBoxStyle = useAnimatedStyle(() => ({
    width: derivedWidth.value,
  }));

  useAnimatedReaction(
    () => width.value,
    (current, previous) => {
      if (previous !== null && current !== previous) {
        scheduleOnRN(onReaction, current);
      }
    }
  );

  return (
    <View style={styles.container}>
      <Animated.View ref={boxRef} style={[styles.box, boxStyle]} />
      <Animated.View
        ref={derivedBoxRef}
        style={[styles.box, derivedBoxStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  box: {
    width: INITIAL_WIDTH,
    height: 50,
    backgroundColor: 'teal',
  },
});
