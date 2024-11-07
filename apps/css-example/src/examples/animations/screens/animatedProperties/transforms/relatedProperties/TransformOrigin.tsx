import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated, { normalizeTransformOrigin } from 'react-native-reanimated';

import { ExamplesScreen } from '@/components';
import { colors, radius, sizes } from '@/theme';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDuration: '3s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
};

type TransformOriginProp = ViewStyle['transformOrigin'];

const calculateAnimationStep = (
  transformOrigins: Array<TransformOriginProp>
) => (transformOrigins.length < 2 ? 100 : 100 / (transformOrigins.length - 1));

const calculateOffset = (index: number, step: number) => {
  const offset = index * step;
  return `${offset.toFixed(offset === Math.round(offset) ? 0 : 2)}%`;
};

export default function TransformOrigin() {
  return (
    <ExamplesScreen<{
      transformOrigins: Array<TransformOriginProp>;
    }>
      buildConfig={({ transformOrigins }) => ({
        animationName: Object.fromEntries(
          transformOrigins.map((origin, index) => {
            return [
              calculateOffset(index, calculateAnimationStep(transformOrigins)),
              {
                transform: [{ rotate: `${index * 360}deg` }],
                transformOrigin: origin,
              },
            ];
          })
        ),
        ...SHARED_SETTINGS,
      })}
      renderExample={({ config, transformOrigins }) => {
        const originDotAnimation: CSSAnimationConfig = {
          animationName: Object.fromEntries(
            transformOrigins.map((origin, index) => {
              const [x, y] = normalizeTransformOrigin(origin!);
              return [
                calculateOffset(
                  index,
                  calculateAnimationStep(transformOrigins)
                ),
                {
                  left: x,
                  top: y,
                  transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
                },
              ];
            })
          ),
          ...SHARED_SETTINGS,
        };

        return (
          <View style={[styles.box, { backgroundColor: colors.primaryLight }]}>
            <Animated.View style={[styles.box, config]}>
              <Animated.View style={[styles.originDot, originDotAnimation]} />
            </Animated.View>
          </View>
        );
      }}
      tabs={[
        {
          name: 'Keywords',
          sections: [
            {
              description:
                'When transform origin is a single keyword value. It is applied only to one axis (`right` and `left` to the **x axis**, `top` and `bottom` to the **y axis**, and `center` to both). The second axis is set to `center` by default.',
              examples: [
                {
                  title: 'Vertical',
                  transformOrigins: ['top', 'bottom'],
                },
                {
                  title: 'Horizontal',
                  transformOrigins: ['left', 'right'],
                },
                {
                  title: 'Through center',
                  transformOrigins: ['left', 'center', 'center', 'top'],
                },
              ],
              title: 'Single value',
            },
            {
              description:
                'When transform origin is a combination of two keyword values. The `top`/`bottom` value is applied to the **y axis** and the `left`/`right` value is applied to the **x axis**. `center` is applied to the **x axis** if is used as the first value or to the **y axis** if is used as the second value.',
              examples: [
                {
                  title: 'Top left to bottom right',
                  transformOrigins: ['top left', 'bottom right'],
                },
                {
                  title: 'Bottom left to top right',
                  transformOrigins: ['bottom left', 'top right'],
                },
                {
                  title: 'Through center',
                  transformOrigins: ['left top', 'center', 'right top'],
                },
              ],
              title: 'Two values',
            },
          ],
        },
        {
          name: 'Absolute',
          sections: [
            {
              description:
                'Single value specified in pixels (or as a number). It is applied only to the **x axis**. The second axis is set to `center` by default.',
              examples: [
                {
                  title: 'As a pixels string',
                  transformOrigins: ['10px', '100px'],
                },
                {
                  title: 'As a number',
                  transformOrigins: [[-50], [100]],
                },
              ],
              title: 'Single value',
            },
            {
              description:
                'Two values specified in pixels (or as a number). The first value is applied to the **x axis** and the second value is applied to the **y axis**.',
              examples: [
                {
                  title: 'Pixels to pixels',
                  transformOrigins: ['-50px -10px', '120px 60px'],
                },
                {
                  title: 'Mixed units',
                  transformOrigins: [
                    [120, '-20px'],
                    ['-50px', 60],
                  ],
                },
              ],
              title: 'Two values',
            },
          ],
        },
        {
          name: 'Relative',
          sections: [
            {
              description:
                'Single value specified in percentage. It is applied only to the **x axis** and is relative to the **width** of the element. The second axis is set to `center` by default.',
              examples: [
                {
                  title: 'As a percentage string',
                  transformOrigins: ['-50%', '100%'],
                },
              ],
              title: 'Single value',
            },
            {
              description:
                'Two values specified in percentage. The first value is applied to the **x axis** and is relative to the **width** of the element. The second value is applied to the **y axis** and is relative to the **height** of the element.',
              examples: [
                {
                  title: 'Percentage to percentage',
                  transformOrigins: ['-50% -50%', '100% 100%'],
                },
              ],
              title: 'Two values',
            },
          ],
        },
        {
          name: 'Mixed',
          sections: [
            {
              description:
                'Single value specified in pixels, as a number, in percentage, or as a keyword.',
              examples: [
                {
                  title: 'Mixed values',
                  transformOrigins: ['-75px', '50%', [-25], 'center'],
                },
              ],
              title: 'Single value',
            },
            {
              description:
                'Two values specified in pixels, as a number, in percentage, or as a keyword.',
              examples: [
                {
                  title: 'Mixed values',
                  transformOrigins: [
                    '-50px 50%',
                    [50, 0],
                    'center bottom',
                    '125%   bottom',
                  ],
                },
              ],
              title: 'Two values',
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  originDot: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    height: sizes.xxxs,
    position: 'absolute',
    width: sizes.xxxs,
  },
});
