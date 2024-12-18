import Animated, { css } from 'react-native-reanimated';

import { TestExampleScreen } from '@/components';
import { colors, flex } from '@/theme';

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
    <Animated.View style={exampleStyles.parent}>
      <Animated.View style={exampleStyles.child}>
        <Animated.View style={exampleStyles.innerChild} />
      </Animated.View>
    </Animated.View>
  );
}

const animationDuration = '2s';

const parent = css.keyframes({
  to: {
    width: 300,
  },
});

const child = css.keyframes({
  to: {
    width: 150,
  },
});

const innerChild = css.keyframes({
  from: {
    opacity: 0,
  },
});

const exampleStyles = css.create({
  child: {
    ...flex.center,
    animationDuration,
    animationFillMode: 'forwards',
    animationIterationCount: 1.5,
    animationName: child,
    backgroundColor: colors.primaryDark,
    height: 75,
    width: '100%',
  },
  innerChild: {
    animationDuration,
    animationName: innerChild,
    backgroundColor: colors.primaryLight,
    height: 30,
    width: 75,
  },
  parent: {
    ...flex.center,
    animationDuration,
    animationIterationCount: 'infinite',
    animationName: parent,
    backgroundColor: colors.primary,
    height: 75,
    width: 0,
  },
});
