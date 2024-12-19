import { StyleSheet, View } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import Animated, { cubicBezier, linear, steps } from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function AnimationTimingFunction() {
  const animation: CSSAnimationProperties = {
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: {
      to: {
        left: '100%',
        transform: [{ translateX: '-100%' }],
      },
    },
  };

  const renderExample = (exampleAnimation: CSSAnimationProperties) => (
    <View style={styles.outerWrapper}>
      <View style={styles.innerWrapper}>
        <Animated.View style={[styles.box, exampleAnimation]} />
      </View>
    </View>
  );

  return (
    <ExampleScreen
      tabs={[
        {
          animation,
          cards: [
            {
              items: [
                { animationTimingFunction: 'ease', label: 'ease' },
                { animationTimingFunction: 'easeIn', label: 'easeIn' },
                { animationTimingFunction: 'easeOut', label: 'easeOut' },
                { animationTimingFunction: 'easeInOut', label: 'easeInOut' },
                { animationTimingFunction: 'linear', label: 'linear' },
                { animationTimingFunction: 'stepStart', label: 'stepStart' },
                {
                  animationFillMode: 'forwards',
                  animationIterationCount: 1,
                  animationTimingFunction: 'stepEnd',
                  label: 'stepEnd',
                },
              ],
              title: 'Predefined Easings',
            },
          ],
          name: 'Predefined',
          renderExample,
        },
        {
          animation,
          cards: [
            {
              description:
                'Specify a Bézier curve to shape the progress of an animation. It is defined by two control points (x1, y1, x2, y2) that mathematically describe the curve.',
              items: [
                {
                  animationTimingFunction: cubicBezier(0.2, 0.9, 0.8, 0.25),
                  label: 'cubicBezier(\n 0.2, 0.9, 0.8, 0.25\n)',
                },
                {
                  animationTimingFunction: cubicBezier(0.1, 1.5, 0.8, 1.5),
                  label: 'cubicBezier(\n 0.1, 1.5, 0.8, 1.5\n)',
                },
                {
                  animationTimingFunction: cubicBezier(0.3, 0, 1, 0),
                  label: 'cubicBezier(\n 0.3, 0, 1, 0\n)',
                },
              ],
              title: 'Cubic Bezier Easing',
            },
          ],
          name: 'CubicBezier',
          renderExample,
        },
        {
          animation,
          cards: [
            {
              description:
                "Specify a simple polygonal chain that always starts at an x-value of 0 and ends at an x-value of 1. You can either specify the points' y and x coordinates or leave the x coordinates to be inferred.",
              items: [
                {
                  animationTimingFunction: linear(0, [0.25, '75%'], 1),
                  label: 'linear(\n 0, [0.25, "75%"], 1\n)',
                },
                {
                  animationTimingFunction: linear(0, [0.25, '25%', '75%'], 1),
                  label: 'linear(\n 0, [0.25, "25%", "75%"], 1\n)',
                },
                {
                  animationTimingFunction: linear(
                    [0.6, '0%'],
                    [0.1, '50%'],
                    [1, '100%']
                  ),
                  label:
                    'linear(\n [0.6, "0%"],\n [0.1, "50%"],\n [1, "100%"]\n)',
                },
              ],
              title: 'Linear Easing with points',
            },
          ],
          name: 'Linear',
          renderExample,
        },
        {
          animation,
          cards: [
            {
              description:
                'Creates an easing function that makes given number of even steps over increasing y-values. The second argument is a modifier that adds jumps before or after the steps.',
              items: [
                {
                  animationTimingFunction: steps(2, 'jumpStart'),
                  label: steps(2, 'jumpStart').toString(),
                },
                {
                  animationTimingFunction: steps(4, 'jumpEnd'),
                  label: steps(4, 'jumpEnd').toString(),
                },
                {
                  animationTimingFunction: steps(5, 'jumpNone'),
                  label: steps(5, 'jumpNone').toString(),
                },
                {
                  animationTimingFunction: steps(3, 'jumpBoth'),
                  label: steps(3, 'jumpBoth').toString(),
                },
              ],
              title: 'Steps Easing',
            },
          ],
          name: 'Steps',
          renderExample,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
  innerWrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  outerWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    paddingHorizontal: sizes.sm / 2,
  },
});
