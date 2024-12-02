import { StyleSheet } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { TestExampleScreen } from '@/components';
import { colors, flex } from '@/theme';

const animationDuration = '2s';

const parentAnimation: CSSAnimationProperties = {
  animationDuration,
  animationIterationCount: 'infinite',
  animationName: {
    to: {
      width: 300,
    },
  },
};

const childAnimation: CSSAnimationProperties = {
  animationDuration,
  animationFillMode: 'forwards',
  animationIterationCount: 1.5,
  animationName: {
    to: {
      width: 150,
    },
  },
};

const innerChildAnimation: CSSAnimationProperties = {
  animationDuration,
  animationName: {
    from: {
      opacity: 0,
    },
  },
};

export default function IterationCountAndFillMode() {
  return (
    <TestExampleScreen
      sections={[
        {
          content: [
            {
              content: [
                'In this example, the **width** of the **dark blue component** (**child**) is animated from `100%` to `150`. Its parent width also changes, so the percentage width of the **child** will change with the parent. The number of iterations is set to `1.5`, thus the animation will play **once and a half**. The fill mode is set to `forwards`, so the **child** should keep the last keyframe value, that is a width between `100%` and `150`, which cannot be represented by a single value (neither as a percentage nor as a pixel value).',
              ],
              title: 'Description',
            },
            {
              content: [
                'After finishing the animation (`1.5`` iterations), the child width should change if its parent width changes.',
              ],
              title: 'Expected behavior',
            },
          ],
          example: <Example />,
          labelTypes: ['needsFix'],
          title: 'Iteration Count and Fill Mode',
          webExampleLink:
            'https://codepen.io/Mateusz-opaciski/pen/YzmbwXM?editors=1100',
        },
      ]}
    />
  );
}

function Example() {
  return (
    <Animated.View style={[exampleStyles.parent, parentAnimation]}>
      <Animated.View style={[exampleStyles.child, childAnimation]}>
        <Animated.View
          style={[exampleStyles.innerChild, innerChildAnimation]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const exampleStyles = StyleSheet.create({
  child: {
    ...flex.center,
    backgroundColor: colors.primaryDark,
    height: 75,
    width: '100%',
  },

  innerChild: {
    backgroundColor: colors.primaryLight,
    height: 30,
    width: 75,
  },
  parent: {
    ...flex.center,
    backgroundColor: colors.primary,
    height: 75,
    width: 0,
  },
});
