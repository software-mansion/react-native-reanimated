import type { PropsWithChildren } from 'react';
import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { PatternProps } from 'react-native-svg';
import { Defs, Pattern, Rect, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const TypedDefs = Defs as React.ComponentType<PropsWithChildren>;
const AnimatedPattern = Animated.createAnimatedComponent(Pattern);

type PatternExtraProps = {
  patternUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  tileWidth?: number;
  tileHeight?: number;
};

// With userSpaceOnUse, numeric values are in viewBox user units, but percentages resolve
// relative to the SVG element's physical layout size in screen pixels. These two coordinate
// spaces only align when the SVG element's physical size matches the viewBox dimensions.
const MIXED_UNITS_NOTE =
  "**Note:** With `userSpaceOnUse`, mixing absolute and percentage values is not fully supported — the absolute value is in viewBox user units, but the percentage resolves relative to the SVG element's physical layout size in screen pixels. These coordinate spaces only align when the two happen to match.";

export default function PatternExample() {
  return (
    <ExamplesScreen<
      {
        keyframes: CSSAnimationKeyframes<PatternProps>;
        props?: PatternExtraProps;
      },
      PatternProps
    >
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation, props }) => (
        <Svg height={100} viewBox="0 0 100 100" width={100}>
          <TypedDefs>
            <AnimatedPattern
              animatedProps={animation}
              height={props?.tileHeight ?? 20}
              id="stripes"
              patternUnits={props?.patternUnits ?? 'userSpaceOnUse'}
              width={props?.tileWidth ?? 20}>
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
                    'With `userSpaceOnUse`, x is in the viewBox coordinate space. Animates from 5 to 20 viewBox user units.',
                  keyframes: { from: { x: 5 }, to: { x: 20 } },
                  props: {
                    patternUnits: 'userSpaceOnUse',
                    tileHeight: 20,
                    tileWidth: 20,
                  },
                  title: 'Numeric (userSpaceOnUse)',
                },
                {
                  description:
                    "With `objectBoundingBox`, x is a fraction of the bounding box of the element referencing the pattern. `0.05` = 5% and `0.2` = 20% of the referencing element's width.",
                  keyframes: { from: { x: 0.05 }, to: { x: 0.2 } },
                  props: {
                    patternUnits: 'objectBoundingBox',
                    tileHeight: 0.2,
                    tileWidth: 0.2,
                  },
                  title: 'Numeric (objectBoundingBox)',
                },
                {
                  description:
                    "Percentage values resolve relative to the SVG element's physical layout width in screen pixels.",
                  keyframes: { from: { x: '5%' }, to: { x: '20%' } },
                  title: 'Percentage',
                },
                {
                  description: MIXED_UNITS_NOTE,
                  keyframes: { from: { x: 15 }, to: { x: '30%' } },
                  title: 'Mixed',
                },
              ],
              title: 'X Offset',
            },
            {
              examples: [
                {
                  description:
                    'With `userSpaceOnUse`, y is in the viewBox coordinate space. Animates from 5 to 20 viewBox user units.',
                  keyframes: { from: { y: 5 }, to: { y: 20 } },
                  props: {
                    patternUnits: 'userSpaceOnUse',
                    tileHeight: 20,
                    tileWidth: 20,
                  },
                  title: 'Numeric (userSpaceOnUse)',
                },
                {
                  description:
                    "With `objectBoundingBox`, y is a fraction of the bounding box of the element referencing the pattern. `0.05` = 5% and `0.2` = 20% of the referencing element's height.",
                  keyframes: { from: { y: 0.05 }, to: { y: 0.2 } },
                  props: {
                    patternUnits: 'objectBoundingBox',
                    tileHeight: 0.2,
                    tileWidth: 0.2,
                  },
                  title: 'Numeric (objectBoundingBox)',
                },
                {
                  description:
                    "Percentage values resolve relative to the SVG element's physical layout height in screen pixels.",
                  keyframes: { from: { y: '5%' }, to: { y: '20%' } },
                  title: 'Percentage',
                },
                {
                  description: MIXED_UNITS_NOTE,
                  keyframes: { from: { y: 15 }, to: { y: '30%' } },
                  title: 'Mixed',
                },
              ],
              title: 'Y Offset',
            },
          ],
        },
        {
          name: 'Size',
          sections: [
            {
              examples: [
                {
                  description:
                    'With `userSpaceOnUse`, tile width is in the viewBox coordinate space. Animates from 15 to 30 viewBox user units.',
                  keyframes: { from: { width: 15 }, to: { width: 30 } },
                  props: { patternUnits: 'userSpaceOnUse' },
                  title: 'Numeric (userSpaceOnUse)',
                },
                {
                  description:
                    "With `objectBoundingBox`, tile width is a fraction of the bounding box of the element referencing the pattern. `0.15` = 15% and `0.3` = 30% of the referencing element's width.",
                  keyframes: { from: { width: 0.15 }, to: { width: 0.3 } },
                  props: { patternUnits: 'objectBoundingBox' },
                  title: 'Numeric (objectBoundingBox)',
                },
                {
                  description:
                    "Percentage values resolve relative to the SVG element's physical layout width in screen pixels.",
                  keyframes: {
                    from: { width: '15%' },
                    to: { width: '30%' },
                  },
                  title: 'Percentage',
                },
                {
                  description: MIXED_UNITS_NOTE,
                  keyframes: { from: { width: 15 }, to: { width: '30%' } },
                  title: 'Mixed',
                },
              ],
              title: 'Tile Width',
            },
            {
              examples: [
                {
                  description:
                    'With `userSpaceOnUse`, tile height is in the viewBox coordinate space. Animates from 15 to 30 viewBox user units.',
                  keyframes: { from: { height: 15 }, to: { height: 30 } },
                  props: { patternUnits: 'userSpaceOnUse' },
                  title: 'Numeric (userSpaceOnUse)',
                },
                {
                  description:
                    "With `objectBoundingBox`, tile height is a fraction of the bounding box of the element referencing the pattern. `0.15` = 15% and `0.3` = 30% of the referencing element's height.",
                  keyframes: { from: { height: 0.15 }, to: { height: 0.3 } },
                  props: { patternUnits: 'objectBoundingBox' },
                  title: 'Numeric (objectBoundingBox)',
                },
                {
                  description:
                    "Percentage values resolve relative to the SVG element's physical layout height in screen pixels.",
                  keyframes: {
                    from: { height: '15%' },
                    to: { height: '30%' },
                  },
                  title: 'Percentage',
                },
                {
                  description: MIXED_UNITS_NOTE,
                  keyframes: { from: { height: 15 }, to: { height: '30%' } },
                  title: 'Mixed',
                },
              ],
              title: 'Tile Height',
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
