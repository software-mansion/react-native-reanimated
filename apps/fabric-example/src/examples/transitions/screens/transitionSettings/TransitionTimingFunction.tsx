import { TabView } from '../../../../components';
import { colors, radius, sizes } from '../../../../theme';
import { StyleSheet, View } from 'react-native';
import type { CSSTransitionConfig, StyleProps } from 'react-native-reanimated';
import Animated, { cubicBezier, linear, steps } from 'react-native-reanimated';
import { ExampleScreen } from './components';

export default function TransitionTimingFunction() {
  const sharedConfig: CSSTransitionConfig = {
    transitionProperty: ['left', 'transform'],
    transitionDuration: '1.5s',
  };

  const transitionStyles: StyleProps[] = [
    { left: '0%', transform: [{ translateX: '0%' }] },
    { left: '100%', transform: [{ translateX: '-100%' }] },
  ];

  const renderExample = (
    exampleConfig: CSSTransitionConfig,
    style: StyleProps
  ) => (
    <View style={styles.outerWrapper}>
      <View style={styles.innerWrapper}>
        <Animated.View style={[styles.box, exampleConfig, style]} />
      </View>
    </View>
  );

  const sharedProps = {
    sharedConfig,
    transitionStyles,
    renderExample,
    displayStyleChanges: false,
  };

  return (
    <TabView>
      <TabView.Tab name="Predefined">
        <ExampleScreen
          {...sharedProps}
          cards={[
            {
              title: 'Predefined Easings',
              items: [
                { transitionTimingFunction: 'ease', label: 'ease' },
                { transitionTimingFunction: 'easeIn', label: 'easeIn' },
                { transitionTimingFunction: 'easeOut', label: 'easeOut' },
                { transitionTimingFunction: 'easeInOut', label: 'easeInOut' },
                { transitionTimingFunction: 'linear', label: 'linear' },
                { transitionTimingFunction: 'stepStart', label: 'stepStart' },
                {
                  transitionTimingFunction: 'stepEnd',
                  label: 'stepEnd',
                },
              ],
            },
          ]}
        />
      </TabView.Tab>
      <TabView.Tab name="CubicBezier">
        <ExampleScreen
          {...sharedProps}
          cards={[
            {
              title: 'Cubic Bezier Easing',
              description:
                'Specify a Bézier curve to shape the progress of a transition. It is defined by two control points (x1, y1, x2, y2) that mathematically describe the curve.',
              items: [
                {
                  transitionTimingFunction: cubicBezier(0.2, 0.9, 0.8, 0.25),
                  label: 'cubicBezier(\n 0.2, 0.9, 0.8, 0.25\n)',
                },
                {
                  transitionTimingFunction: cubicBezier(0.1, 1.5, 0.8, 1.5),
                  label: 'cubicBezier(\n 0.1, 1.5, 0.8, 1.5\n)',
                },
                {
                  transitionTimingFunction: cubicBezier(0.3, 0, 1, 0),
                  label: 'cubicBezier(\n 0.3, 0, 1, 0\n)',
                },
              ],
            },
          ]}
        />
      </TabView.Tab>
      <TabView.Tab name="Linear">
        <ExampleScreen
          {...sharedProps}
          cards={[
            {
              title: 'Linear Easing with points',
              description:
                "Specify a simple polygonal chain that always starts at an x-value of 0 and ends at an x-value of 1. You can either specify the points' y and x coordinates or leave the x coordinates to be inferred.",
              items: [
                {
                  transitionTimingFunction: linear([
                    0,
                    { y: 0.25, x: '75%' },
                    1,
                  ]),
                  label: "linear([\n 0,\n {y: 0.25, x: '75%'},\n 1\n])",
                },
                {
                  transitionTimingFunction: linear([
                    { y: 0.6, x: '0%' },
                    { y: 0.1, x: '50%' },
                    { y: 1, x: '100%' },
                  ]),
                  label:
                    "linear([\n {y: 0.6, x: '0%'},\n {y: 0.1, x: '50%'},\n {y: 1, x: '100%'}\n])",
                },
              ],
            },
          ]}
        />
      </TabView.Tab>
      <TabView.Tab name="Steps">
        <ExampleScreen
          {...sharedProps}
          cards={[
            {
              title: 'Steps Easing',
              description:
                'Creates an easing function that makes given number of even steps over increasing y-values. The second argument is a modifier that adds jumps before or after the steps.',
              items: [
                {
                  transitionTimingFunction: steps(2, 'jumpStart'),
                  label: "steps(2, 'jumpStart') or\nsteps(2, 'start')",
                },
                {
                  transitionTimingFunction: steps(4, 'jumpEnd'),
                  label: "steps(4, 'jumpEnd') or\nsteps(4, 'end')",
                },
                {
                  transitionTimingFunction: steps(5, 'jumpNone'),
                  label: "steps(5, 'jumpNone')",
                },
                {
                  transitionTimingFunction: steps(3, 'jumpBoth'),
                  label: "steps(3, 'jumpBoth')",
                },
              ],
            },
          ]}
        />
      </TabView.Tab>
    </TabView>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
  outerWrapper: {
    backgroundColor: colors.background2,
    paddingHorizontal: sizes.sm / 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  innerWrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
});
