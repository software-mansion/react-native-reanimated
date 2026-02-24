import type { JSX } from 'react';
import Animated, {
  type CSSAnimationKeyframes,
  type CSSAnimationProperties,
} from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { CircleProps, PolygonProps } from 'react-native-svg';
import { Circle, Polygon, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import type { AnyRecord } from '@/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

function CircleExample({
  animation,
  props,
}: {
  animation: CSSAnimationProperties<CircleProps>;
  props?: CircleProps;
}) {
  return (
    <Svg height={100} width={100}>
      <AnimatedCircle
        animatedProps={animation}
        cx={50}
        cy={50}
        r={20}
        {...props}
      />
    </Svg>
  );
}

function PolygonExample({
  animation,
  props,
}: {
  animation: CSSAnimationProperties<PolygonProps>;
  props?: PolygonProps;
}) {
  return (
    <Svg height={200} viewBox="40 -10 220 120" width={200}>
      <AnimatedPolygon
        animatedProps={animation}
        points="150,0 121,90 198,35 102,35 179,90"
        stroke="red"
        strokeWidth={2}
        {...props}
      />
    </Svg>
  );
}

export default function FillAndColorExample() {
  return (
    <ExamplesScreen<
      {
        keyframes: CSSAnimationKeyframes<CircleProps>;
        render: <T extends AnyRecord>(
          animation: CSSAnimationProperties<T>
        ) => JSX.Element;
      },
      CircleProps
    >
      renderExample={({ animation, render }) => render(animation)}
      buildAnimation={({ keyframes }) => ({
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      sections={[
        {
          examples: [
            {
              description:
                '`color` property is used everywhere where the `"currentColor"` is used as a value. For example, here we set `fill` property to `"currentColor"``',
              keyframes: {
                '50%': {
                  color: 'hsl(130, 80%, 25%)',
                },
                to: {
                  color: 'red',
                },
              },
              render: (animation) => (
                <CircleExample
                  animation={animation}
                  props={{ fill: 'currentColor' }}
                />
              ),
              title: 'Color',
            },
          ],
          title: 'Color',
        },
        {
          examples: [
            {
              description:
                'In this example we animate only the `fill` property without setting the `color` property',
              keyframes: {
                '50%': {
                  fill: 'hsl(130, 80%, 25%)',
                },
                to: {
                  fill: 'red',
                },
              },
              render: (animation) => <CircleExample animation={animation} />,
              title: 'Fill',
            },
            {
              description:
                'In this example we animate the `fillOpacity` property',
              keyframes: {
                '50%': {
                  fillOpacity: 0.5,
                },
                to: {
                  fillOpacity: 1,
                },
              },
              render: (animation) => <CircleExample animation={animation} />,
              title: 'Fill Opacity',
            },
            {
              description: 'In this example we animate the `fillRule` property',
              keyframes: {
                from: {
                  fillRule: 'evenodd',
                },
                to: {
                  fillRule: 'nonzero',
                },
              },
              render: (animation) => <PolygonExample animation={animation} />,
              title: 'Fill Rule',
            },
          ],
          title: 'Fill props',
        },
      ]}
    />
  );
}
