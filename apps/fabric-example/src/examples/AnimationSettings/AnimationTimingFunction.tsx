import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import { colors, radius, sizes } from '../../theme';
import Animated, { cubicBezier, linear, steps } from 'react-native-reanimated';
import { ExampleScreen } from './components';
import { TabView } from '../../components';

export default function AnimationTimingFunction() {
  const config: CSSAnimationConfig = {
    animationName: {
      to: {
        left: '100%',
        transform: [{ translateX: '-100%' }],
      },
    },
    animationIterationCount: 'infinite',
    animationDuration: '2s',
  };

  const renderExample = (exampleConfig: CSSAnimationConfig) => (
    <View style={styles.outerWrapper}>
      <View style={styles.innerWrapper}>
        <Animated.View style={[styles.box, exampleConfig]} />
      </View>
    </View>
  );

  return (
    <TabView>
      <TabView.Tab name="Predefined">
        <ExampleScreen
          config={config}
          renderExample={renderExample}
          cards={[
            {
              title: 'Predefined Easings',
              items: [
                { animationTimingFunction: 'ease', label: 'ease' },
                { animationTimingFunction: 'easeIn', label: 'easeIn' },
                { animationTimingFunction: 'easeOut', label: 'easeOut' },
                { animationTimingFunction: 'easeInOut', label: 'easeInOut' },
                { animationTimingFunction: 'linear', label: 'linear' },
                { animationTimingFunction: 'stepStart', label: 'stepStart' },
                {
                  animationTimingFunction: 'stepEnd',
                  animationIterationCount: 1,
                  animationFillMode: 'forwards',
                  label: 'stepEnd',
                },
              ],
            },
          ]}
        />
      </TabView.Tab>
      <TabView.Tab name="CubicBezier">
        <ExampleScreen
          config={config}
          renderExample={renderExample}
          cards={[
            {
              title: 'Cubic Bezier Easing',
              description:
                'Specify a Bézier curve to shape the progress of an animation or a transition. It is defined by two control points (x1, y1, x2, y2) that mathematically describe the curve.',
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
            },
          ]}
        />
      </TabView.Tab>
      <TabView.Tab name="Linear">
        <ExampleScreen
          config={config}
          renderExample={renderExample}
          cards={[
            {
              title: 'Linear Easing with points',
              description:
                "Specify a simple polygonal chain that always starts at an x-value of 0 and ends at an x-value of 1. You can either specify the points' y and x coordinates or leave the x coordinates to be inferred.",
              items: [
                {
                  animationTimingFunction: linear([
                    0,
                    { y: 0.25, x: '75%' },
                    1,
                  ]),
                  label: "linear([\n 0,\n {y: 0.25, x: '75%'},\n 1\n])",
                },
                {
                  animationTimingFunction: linear([
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
          config={config}
          renderExample={renderExample}
          cards={[
            {
              title: 'Steps Easing',
              description:
                'Creates an easing function that makes given number of even steps over increasing y-values. The second argument is a modifier that adds jumps before or after the steps.',
              items: [
                {
                  animationTimingFunction: steps(2, 'jumpStart'),
                  label: "steps(2, 'jumpStart') or\nsteps(2, 'start')",
                },
                {
                  animationTimingFunction: steps(4, 'jumpEnd'),
                  label: "steps(4, 'jumpEnd') or\nsteps(4, 'end')",
                },
                {
                  animationTimingFunction: steps(5, 'jumpNone'),
                  label: "steps(5, 'jumpNone')",
                },
                {
                  animationTimingFunction: steps(3, 'jumpBoth'),
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
