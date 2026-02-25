// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { PropsWithChildren } from 'react';
import Animated, {
  type CSSAnimationKeyframes,
  type CSSPatternProps,
} from 'react-native-reanimated';
import { Circle, Defs, Pattern, Rect, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

// TODO - Fix me
// RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
const TypedDefs = Defs as React.ComponentType<PropsWithChildren>;
const AnimatedPattern = Animated.createAnimatedComponent(Pattern);

export default function PatternExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<CSSPatternProps> },
      CSSPatternProps
    >
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} viewBox="0 0 100 100" width={100}>
          <TypedDefs>
            <AnimatedPattern
              animatedProps={animation}
              height={20}
              id="stripes"
              patternUnits="userSpaceOnUse"
              width={20}>
              <Rect fill={colors.primary} height={10} width={20} />
              <Rect fill={colors.primaryLight} height={10} width={20} y={10} />
            </AnimatedPattern>
          </TypedDefs>
          <Rect fill="url(#stripes)" height={100} width={100} />
        </Svg>
      )}
      tabs={[
        {
          name: 'Position',
          sections: [
            {
              examples: [
                {
                  description:
                    'Animates the pattern offset along the X axis, making the stripes appear to scroll horizontally.',
                  keyframes: {
                    from: { x: 0 },
                    to: { x: 20 },
                  },
                  title: 'Horizontal scroll',
                },
                {
                  description:
                    'Animates the pattern offset along the Y axis, making the stripes appear to scroll vertically.',
                  keyframes: {
                    from: { y: 0 },
                    to: { y: 20 },
                  },
                  title: 'Vertical scroll',
                },
                {
                  description:
                    'Animates both X and Y offsets simultaneously, creating a diagonal scrolling effect.',
                  keyframes: {
                    from: { x: 0, y: 0 },
                    to: { x: 20, y: 20 },
                  },
                  title: 'Diagonal scroll',
                },
              ],
              title: 'Offset (x, y)',
            },
          ],
        },
        {
          name: 'Size',
          renderExample: ({ animation }) => (
            <Svg height={100} viewBox="0 0 100 100" width={100}>
              <TypedDefs>
                <AnimatedPattern
                  animatedProps={animation}
                  height={20}
                  id="dots"
                  patternUnits="userSpaceOnUse"
                  width={20}>
                  <Circle cx={10} cy={10} fill={colors.primary} r={5} />
                </AnimatedPattern>
              </TypedDefs>
              <Rect fill="url(#dots)" height={100} width={100} />
            </Svg>
          ),
          sections: [
            {
              examples: [
                {
                  description:
                    'Animates the tile width, controlling how far apart dots are spaced horizontally.',
                  keyframes: {
                    from: { width: 15 },
                    to: { width: 30 },
                  },
                  title: 'Tile width',
                },
                {
                  description:
                    'Animates the tile height, controlling the vertical spacing between dots.',
                  keyframes: {
                    from: { height: 15 },
                    to: { height: 30 },
                  },
                  title: 'Tile height',
                },
                {
                  description:
                    'Animates both tile dimensions simultaneously, uniformly scaling the entire repeating pattern.',
                  keyframes: {
                    from: { height: 12, width: 12 },
                    to: { height: 28, width: 28 },
                  },
                  title: 'Tile size (width and height)',
                },
              ],
              title: 'Tile dimensions (width, height)',
            },
          ],
        },
        {
          name: 'Units',
          sections: [
            {
              examples: [
                {
                  description:
                    'With `patternUnits: "userSpaceOnUse"`, the pattern tile is defined in absolute user coordinates. Animating to `"objectBoundingBox"` reinterprets those same values as fractions of the bounding box, causing an abrupt jump.',
                  keyframes: {
                    from: {
                      height: 20,
                      patternUnits: 'userSpaceOnUse',
                      width: 20,
                    },
                    to: {
                      height: 20,
                      patternUnits: 'objectBoundingBox',
                      width: 20,
                    },
                  },
                  title: 'patternUnits interpolation',
                },
              ],
              title: 'Coordinate systems',
            },
          ],
        },
      ]}
    />
  );
}
