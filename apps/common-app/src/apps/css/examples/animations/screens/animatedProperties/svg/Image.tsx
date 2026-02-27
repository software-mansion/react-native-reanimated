import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Image, type ImageProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function ImageExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<ImageProps>; viewBox?: string },
      ImageProps
    >
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation, viewBox }) => (
        <Svg
          height={100}
          preserveAspectRatio="none"
          viewBox={viewBox ?? '0 0 100 100'}
          width={100}>
          <AnimatedImage
            animatedProps={animation}
            height={60}
            href="https://miro.medium.com/v2/resize:fill:160:160/1*5QvEwVc_cxdJHcepbaRHhw.jpeg"
            width={60}
            x={20}
            y={20}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Position',
          sections: [
            {
              examples: [
                {
                  description: 'Animates from default `x=20` to `x=50`',
                  keyframes: {
                    to: {
                      x: 50,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      x: '10%',
                    },
                    to: {
                      x: '50%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      x: 20,
                    },
                    to: {
                      x: '50%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'X Position',
            },
            {
              examples: [
                {
                  description: 'Animates from default `y=20` to `y=50`',
                  keyframes: {
                    to: {
                      y: 50,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      y: '10%',
                    },
                    to: {
                      y: '50%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      y: 20,
                    },
                    to: {
                      y: '50%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'Y Position',
            },
          ],
        },
        {
          name: 'Size',
          sections: [
            {
              examples: [
                {
                  description: 'Animates from default `width=60` to `width=80`',
                  keyframes: {
                    from: {
                      height: 0,
                      width: 0,
                    },
                    to: {
                      height: 80,
                      width: 80,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      height: '0%',
                      width: '0%',
                    },
                    to: {
                      height: '70%',
                      width: '70%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      width: 60,
                    },
                    to: {
                      width: '70%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'Width',
            },
            {
              examples: [
                {
                  description:
                    'Animates from default `height=60` to `height=80`',
                  keyframes: {
                    to: {
                      height: 80,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      height: '30%',
                    },
                    to: {
                      height: '70%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      height: 60,
                    },
                    to: {
                      height: '70%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'Height',
            },
          ],
        },
      ]}
    />
  );
}
