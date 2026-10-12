import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const COMPONENT_REF = 'BackgroundImageComponent';
const NOTIFICATION_NAME = 'UPDATE_BACKGROUND_IMAGE';

type BackgroundImage = NonNullable<ViewStyle['backgroundImage']>;

const RED = '#ff0000ff';
const GREEN = '#00ff00ff';
const BLUE = '#0000ffff';
const YELLOW = '#ffe600ff';
const WHITE = '#ffffffff';
const TRANSPARENT_BLUE = '#0000ff00';

const fromColor = (progress: number) => {
  'worklet';
  return interpolateColor(progress, [0, 1], ['#ff0000', '#00ff00']);
};

const toColor = (progress: number) => {
  'worklet';
  return interpolateColor(progress, [0, 1], ['#0000ff', '#ffe600']);
};

const offset = (progress: number) => {
  'worklet';
  return `${interpolate(progress, [0, 1], [10, 90])}%`;
};

const angle = (progress: number) => {
  'worklet';
  return interpolate(progress, [0, 1], [45, 225]);
};

function BackgroundImageComponent({
  getBackgroundImage,
}: {
  getBackgroundImage: (progress: number) => BackgroundImage;
}) {
  const progress = useSharedValue(0);
  const ref = useTestRef(COMPONENT_REF);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundImage: getBackgroundImage(progress.value),
  }));

  useEffect(() => {
    const timeout = setTimeout(() => {
      progress.value = withTiming(1, { duration: 300 }, () => {
        notify(NOTIFICATION_NAME);
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [progress]);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.box, animatedStyle]} />
    </View>
  );
}

describe('animation of backgroundImage', () => {
  test.each([
    {
      description: 'linear gradient color stops',
      getBackgroundImage: (progress: number): BackgroundImage => {
        'worklet';
        return [
          {
            type: 'linear-gradient',
            direction: 'to right',
            colorStops: [
              { color: fromColor(progress) },
              { color: toColor(progress) },
            ],
          },
        ];
      },
      expectedStart: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
      expectedFinal: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: GREEN, position: null },
            { color: YELLOW, position: null },
          ],
        },
      ],
    },
    {
      description: 'linear gradient angle direction',
      getBackgroundImage: (progress: number): BackgroundImage => {
        'worklet';
        return [
          {
            type: 'linear-gradient',
            direction: `${angle(progress)}deg`,
            colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }],
          },
        ];
      },
      expectedStart: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 45 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
      expectedFinal: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 225 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
    },
    {
      description: 'linear gradient keyword direction and stop positions',
      getBackgroundImage: (progress: number): BackgroundImage => {
        'worklet';
        return [
          {
            type: 'linear-gradient',
            direction: 'to top right',
            colorStops: [
              { color: '#ff0000', positions: ['0%'] },
              { color: '#0000ff', positions: [offset(progress)] },
              { color: '#ffe600', positions: ['100%'] },
            ],
          },
        ];
      },
      expectedStart: [
        {
          type: 'linear-gradient',
          direction: { type: 'keyword', value: 'to top right' },
          colorStops: [
            { color: RED, position: '0%' },
            { color: BLUE, position: '10%' },
            { color: YELLOW, position: '100%' },
          ],
        },
      ],
      expectedFinal: [
        {
          type: 'linear-gradient',
          direction: { type: 'keyword', value: 'to top right' },
          colorStops: [
            { color: RED, position: '0%' },
            { color: BLUE, position: '90%' },
            { color: YELLOW, position: '100%' },
          ],
        },
      ],
    },
    {
      description: 'radial gradient keyword size and position',
      getBackgroundImage: (progress: number): BackgroundImage => {
        'worklet';
        return [
          {
            type: 'radial-gradient',
            shape: 'circle',
            size: 'farthest-side',
            position: { top: '50%', left: offset(progress) },
            colorStops: [
              { color: fromColor(progress) },
              { color: toColor(progress) },
            ],
          },
        ];
      },
      expectedStart: [
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'farthest-side',
          position: { top: '50%', left: '10%' },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
      expectedFinal: [
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'farthest-side',
          position: { top: '50%', left: '90%' },
          colorStops: [
            { color: GREEN, position: null },
            { color: YELLOW, position: null },
          ],
        },
      ],
    },
    {
      description: 'radial gradient explicit size',
      getBackgroundImage: (progress: number): BackgroundImage => {
        'worklet';
        return [
          {
            type: 'radial-gradient',
            shape: 'ellipse',
            size: { x: offset(progress), y: 50 },
            position: { bottom: '25%', right: 20 },
            colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }],
          },
        ];
      },
      expectedStart: [
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: { x: '10%', y: 50 },
          position: { bottom: '25%', right: 20 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
      expectedFinal: [
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: { x: '90%', y: 50 },
          position: { bottom: '25%', right: 20 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
    },
    {
      description: 'multiple layers',
      getBackgroundImage: (progress: number): BackgroundImage => {
        'worklet';
        return [
          {
            type: 'radial-gradient',
            shape: 'circle',
            size: 'closest-side',
            position: { top: '50%', left: offset(progress) },
            colorStops: [{ color: '#ffffff' }, { color: '#0000ff00' }],
          },
          {
            type: 'linear-gradient',
            direction: 'to bottom',
            colorStops: [
              { color: fromColor(progress) },
              { color: toColor(progress) },
            ],
          },
        ];
      },
      expectedStart: [
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'closest-side',
          position: { top: '50%', left: '10%' },
          colorStops: [
            { color: WHITE, position: null },
            { color: TRANSPARENT_BLUE, position: null },
          ],
        },
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 180 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ],
      expectedFinal: [
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'closest-side',
          position: { top: '50%', left: '90%' },
          colorStops: [
            { color: WHITE, position: null },
            { color: TRANSPARENT_BLUE, position: null },
          ],
        },
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 180 },
          colorStops: [
            { color: GREEN, position: null },
            { color: YELLOW, position: null },
          ],
        },
      ],
    },
    {
      description: 'css string',
      getBackgroundImage: (progress: number): BackgroundImage => {
        'worklet';
        return `linear-gradient(${angle(progress)}deg, ${fromColor(progress)}, 30%, ${toColor(progress)} ${offset(progress)}), radial-gradient(circle at 30% 50%, #ffffff, #0000ff00 20px)`;
      },
      expectedStart: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 45 },
          colorStops: [
            { color: RED, position: null },
            { color: null, position: '30%' },
            { color: BLUE, position: '10%' },
          ],
        },
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'farthest-corner',
          position: { top: '50%', left: '30%' },
          colorStops: [
            { color: WHITE, position: null },
            { color: TRANSPARENT_BLUE, position: 20 },
          ],
        },
      ],
      expectedFinal: [
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 225 },
          colorStops: [
            { color: GREEN, position: null },
            { color: null, position: '30%' },
            { color: YELLOW, position: '90%' },
          ],
        },
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'farthest-corner',
          position: { top: '50%', left: '30%' },
          colorStops: [
            { color: WHITE, position: null },
            { color: TRANSPARENT_BLUE, position: 20 },
          ],
        },
      ],
    },
  ])(
    'Animate ${description}',
    async ({ getBackgroundImage, expectedStart, expectedFinal }) => {
      await render(
        <BackgroundImageComponent getBackgroundImage={getBackgroundImage} />
      );

      const component = getTestComponent(COMPONENT_REF);

      expect(await component.getAnimatedStyle('backgroundImage')).toBe(
        JSON.stringify(expectedStart)
      );

      await waitForNotification(NOTIFICATION_NAME);

      expect(await component.getAnimatedStyle('backgroundImage')).toBe(
        JSON.stringify(expectedFinal)
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
