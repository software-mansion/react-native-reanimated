import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionProperties,
  StyleProps,
} from 'react-native-reanimated';
import Animated, { cubicBezier, linear, steps } from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function TransitionTimingFunction() {
  const transitionProperties: CSSTransitionProperties<ViewStyle> = {
    transitionDuration: '1.5s',
    transitionProperty: ['left', 'transform'],
  };

  const transitionStyles: Array<StyleProps> = [
    { left: '0%', transform: [{ translateX: '0%' }] },
    { left: '100%', transform: [{ translateX: '-100%' }] },
  ];

  const renderExample = (
    exampleConfig: CSSTransitionProperties<ViewStyle>,
    style: StyleProps
  ) => (
    <View style={styles.outerWrapper}>
      <View style={styles.innerWrapper}>
        <Animated.View style={[styles.box, exampleConfig, style]} />
      </View>
    </View>
  );

  const sharedProps = {
    renderExample,
    transitionProperties,
    transitionStyles,
  };

  return (
    <ExampleScreen
      tabs={[
        {
          ...sharedProps,
          cards: [
            {
              items: [
                { label: 'ease', transitionTimingFunction: 'ease' },
                { label: 'ease-in', transitionTimingFunction: 'ease-in' },
                { label: 'ease-out', transitionTimingFunction: 'ease-out' },
                {
                  label: 'ease-in-out',
                  transitionTimingFunction: 'ease-in-out',
                },
                { label: 'linear', transitionTimingFunction: 'linear' },
                { label: 'step-start', transitionTimingFunction: 'step-start' },
                {
                  label: 'step-end',
                  transitionTimingFunction: 'step-end',
                },
              ],
              title: 'Predefined Easings',
            },
          ],
          name: 'Predefined',
        },
        {
          ...sharedProps,
          cards: [
            {
              description:
                'Specify a Bézier curve to shape the progress of a transition. It is defined by two control points (x1, y1, x2, y2) that mathematically describe the curve.',
              items: [
                {
                  label: 'cubicBezier(\n 0.2, 0.9, 0.8, 0.25\n)',
                  transitionTimingFunction: cubicBezier(0.2, 0.9, 0.8, 0.25),
                },
                {
                  label: 'cubicBezier(\n 0.1, 1.5, 0.8, 1.5\n)',
                  transitionTimingFunction: cubicBezier(0.1, 1.5, 0.8, 1.5),
                },
                {
                  label: 'cubicBezier(\n 0.3, 0, 1, 0\n)',
                  transitionTimingFunction: cubicBezier(0.3, 0, 1, 0),
                },
              ],
              title: 'Cubic Bezier Easing',
            },
          ],
          name: 'CubicBezier',
        },
        {
          ...sharedProps,
          cards: [
            {
              description:
                "Specify a simple polygonal chain that always starts at an x-value of 0 and ends at an x-value of 1. You can either specify the points' y and x coordinates or leave the x coordinates to be inferred.",
              items: [
                {
                  label: 'linear(\n 0, [0.25, "75%"], 1\n)',
                  transitionTimingFunction: linear(0, [0.25, '75%'], 1),
                },
                {
                  label: 'linear(\n 0, [0.25, "25%", "75%"], 1\n)',
                  transitionTimingFunction: linear(0, [0.25, '25%', '75%'], 1),
                },
                {
                  label:
                    'linear(\n [0.6, "0%"],\n [0.1, "50%"],\n [1, "100%"]\n)',
                  transitionTimingFunction: linear(
                    [0.6, '0%'],
                    [0.1, '50%'],
                    [1, '100%']
                  ),
                },
              ],
              title: 'Linear Easing with points',
            },
          ],
          name: 'Linear',
        },
        {
          ...sharedProps,
          cards: [
            {
              description:
                'Creates an easing function that makes given number of even steps over increasing y-values. The second argument is a modifier that adds jumps before or after the steps.',
              items: [
                {
                  label: steps(2, 'jump-start').toString(),
                  transitionTimingFunction: steps(2, 'jump-start'),
                },
                {
                  label: steps(4, 'jump-end').toString(),
                  transitionTimingFunction: steps(4, 'jump-end'),
                },
                {
                  label: steps(5, 'jump-none').toString(),
                  transitionTimingFunction: steps(5, 'jump-none'),
                },
                {
                  label: steps(3, 'jump-both').toString(),
                  transitionTimingFunction: steps(3, 'jump-both'),
                },
              ],
              title: 'Steps Easing',
            },
          ],
          name: 'Steps',
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
