import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Polyline, type PolylineProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

export default function PolylineExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<PolylineProps>; viewBox?: string },
      PolylineProps
    >
      buildAnimation={({ keyframes }) => ({
        animationName: keyframes,
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation, viewBox }) => (
        <Svg height={100} viewBox={viewBox ?? '0 0 200 200'} width={100}>
          <AnimatedPolyline
            animatedProps={animation}
            // points={[100, 100, 150, 25, 150, 75, 200, 0]}
            fill="none" 
            stroke="black"
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Primitives',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    from: {
                      points: "101,100 150,25 150,75 200,0",
                      fill: "none",
                    },
                    to: {
                      fill: "black",
                      points: "102,100 150,25 150,75 200,0"
                    },
                  },
                  title: 'Line',
                },
              ],
              title: 'Const number of points',
            },
          ],
        }
      ]}
    />
  );
}
