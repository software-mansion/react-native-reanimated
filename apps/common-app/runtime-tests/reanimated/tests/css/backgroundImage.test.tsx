import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';

const COMPONENT_REF = 'CSSBackgroundImageComponent';

const BLACK = '#000000ff';
const WHITE = '#ffffffff';
const GRAY = '#808080ff';
const RED = '#ff0000ff';
const BLUE = '#0000ffff';
const TEAL = '#008080ff';
const HALF_WHITE = '#ffffff80';
const HALF_BLACK = '#00000080';

function PausedAnimation({
  keyframes,
  progress,
}: {
  keyframes: CSSAnimationKeyframes<ViewStyle>;
  progress: number;
}) {
  const ref = useTestRef(COMPONENT_REF);

  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        style={[
          styles.box,
          {
            animationDelay: `${-progress * 1000}ms`,
            animationDuration: '1s',
            animationName: keyframes,
            animationPlayState: 'paused',
            animationTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}

describe('CSS animation of backgroundImage', () => {
  test.each([
    {
      description: 'colors',
      keyframes: {
        from: { backgroundImage: 'linear-gradient(to right, black, white)' },
        to: { backgroundImage: 'linear-gradient(to right, white, black)' },
      },
      progress: 0.5,
      expected: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: GRAY, position: null },
            { color: GRAY, position: null },
          ],
        },
      ],
    },
    {
      description: 'angle direction',
      keyframes: {
        from: { backgroundImage: 'linear-gradient(0deg, red, blue)' },
        to: { backgroundImage: 'linear-gradient(180deg, red, blue)' },
      },
      progress: 0.5,
      expected: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
    },
    {
      description: 'stop positions with CSS position fixup',
      keyframes: {
        from: {
          backgroundImage:
            'linear-gradient(to bottom, red 0%, blue 20%, black)',
        },
        to: {
          backgroundImage:
            'linear-gradient(to bottom, red 0%, blue 80%, black)',
        },
      },
      progress: 0.5,
      expected: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 180 },
          colorStops: [
            { color: RED, position: '0%' },
            { color: BLUE, position: '50%' },
            { color: BLACK, position: null },
          ],
        },
      ],
    },
    {
      description: 'different number of stops',
      keyframes: {
        from: { backgroundImage: 'linear-gradient(to right, red, blue)' },
        to: { backgroundImage: 'linear-gradient(to right, red, blue, lime)' },
      },
      progress: 0.5,
      expected: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: '75%' },
            { color: TEAL, position: '100%' },
          ],
        },
      ],
    },
    {
      description: 'radial position and size',
      keyframes: {
        from: {
          backgroundImage:
            'radial-gradient(20px 20px at 20% 20%, white, black)',
        },
        to: {
          backgroundImage:
            'radial-gradient(80px 40px at 80% 80%, white, black)',
        },
      },
      progress: 0.5,
      expected: [
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: { x: 50, y: 30 },
          position: { top: '50%', left: '50%' },
          colorStops: [
            { color: WHITE, position: null },
            { color: BLACK, position: null },
          ],
        },
      ],
    },
    {
      description: 'added layer fades in from transparent',
      keyframes: {
        from: { backgroundImage: 'linear-gradient(to right, red, blue)' },
        to: {
          backgroundImage:
            'linear-gradient(to right, red, blue), radial-gradient(circle, white, black)',
        },
      },
      progress: 0.5,
      expected: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'farthest-corner',
          position: { top: '50%', left: '50%' },
          colorStops: [
            { color: HALF_WHITE, position: null },
            { color: HALF_BLACK, position: null },
          ],
        },
      ],
    },
    {
      description: 'keyword direction before the halfway switch',
      keyframes: {
        from: { backgroundImage: 'linear-gradient(to top right, red, blue)' },
        to: { backgroundImage: 'linear-gradient(90deg, red, blue)' },
      },
      progress: 0.25,
      expected: [
        {
          type: 'linear-gradient',
          direction: { type: 'keyword', value: 'to top right' },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
    },
    {
      description: 'keyword direction after the halfway switch',
      keyframes: {
        from: { backgroundImage: 'linear-gradient(to top right, red, blue)' },
        to: { backgroundImage: 'linear-gradient(90deg, red, blue)' },
      },
      progress: 0.75,
      expected: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
    },
  ])(
    'Interpolates ${description}',
    async ({ keyframes, progress, expected }) => {
      await render(
        <PausedAnimation keyframes={keyframes} progress={progress} />
      );
      await wait(200);
      const component = getTestComponent(COMPONENT_REF);
      expect(await component.getAnimatedStyle('backgroundImage')).toBe(
        JSON.stringify(expected)
      );
    }
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  box: {
    height: 100,
    width: 100,
  },
});
