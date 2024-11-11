import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationKeyframes,
  StyleProps,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen } from '@/components';
import { colors, radius, sizes } from '@/theme';

export default function AspectRatio() {
  return (
    <ExamplesScreen<{
      keyframes: CSSAnimationKeyframes;
      style?: StyleProps;
      flexDirection?: 'column' | 'row';
    }>
      buildConfig={({ keyframes }) => ({
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
      })}
      tabs={[
        {
          name: 'width/height',
          renderExample: ({ config, style }) => (
            <Animated.View style={[styles.box, style, config]} />
          ),
          sections: [
            {
              description: 'When both `width` and `height` are set.',
              examples: [
                {
                  description:
                    'The `width` is ignored. The `height` is used to calculate the `width` based on the `aspectRatio`.',
                  keyframes: {
                    from: { aspectRatio: 0.5 },
                    to: { aspectRatio: 2 },
                  },
                  style: { height: sizes.md, width: sizes.md },
                  title:
                    'When aspectRatio is specified in the first and the last keyframe',
                },
                {
                  description:
                    'Also works **fractional string** values in the **a/b** format like `4/3` in all examples.',
                  keyframes: {
                    from: { aspectRatio: '21/9' },
                    to: { aspectRatio: '4/3' },
                  },
                  style: { height: sizes.md, width: sizes.md },
                },
                {
                  description:
                    'The `width` of the view is animated from 0% to 50% and then is **immediately removed** from the style.',
                  keyframes: {
                    '0%': { aspectRatio: 0.5 },
                    '50%': { aspectRatio: 2 },
                  },
                  style: { height: sizes.md, width: sizes.md },
                  title: 'When aspectRatio is missing in the last keyframe',
                },
              ],
              title: 'width and height',
            },
            {
              description:
                'When only `width` or only `height` is set, the other dimension is **calculated** based on the `aspectRatio`.',
              examples: [
                {
                  description:
                    'The `height` is calculated based on the `aspectRatio`.',
                  keyframes: {
                    from: { aspectRatio: 0.5 },
                    to: { aspectRatio: 2 },
                  },
                  style: { width: sizes.md },
                  title: 'When only width is set',
                },
                {
                  description:
                    'The `width` is calculated based on the `aspectRatio`.',
                  keyframes: {
                    from: { aspectRatio: 0.5 },
                    to: { aspectRatio: 2 },
                  },
                  style: { height: sizes.md },
                  title: 'When only height is set',
                },
              ],
              title: 'width or height',
            },
            {
              description:
                "When neither `width` nor `height` is set and view dimensions aren't affected by the flex layout, both of dimensions are set to 0.",
              examples: [
                {
                  description:
                    'The `width` and `height` are both set to 0, thus the view is **not visible**.',
                  keyframes: {
                    from: { aspectRatio: 0.5 },
                    to: { aspectRatio: 2 },
                  },
                  style: {},
                  title: 'Neither width nor height',
                },
              ],
              title: 'Neither width nor height',
            },
          ],
        },
        {
          name: 'flexBasis',
          renderExample: ({ config, flexDirection = 'row' }) => {
            const boxStyle = [
              styles.box,
              { flexBasis: sizes.md },
              flexDirection === 'column'
                ? { width: sizes.sm }
                : {
                    height: sizes.sm,
                  },
            ];

            return (
              <View style={{ alignItems: 'center', flexDirection }}>
                <View style={boxStyle} />
                <Animated.View
                  style={[
                    boxStyle,
                    config,
                    { backgroundColor: colors.primaryDark },
                  ]}
                />
                <View style={boxStyle} />
              </View>
            );
          },
          sections: [
            {
              description: [
                'On a view with a set `flexBasis`, `aspectRatio` controls the size of a view in the **cross axis** if unset.',
                'Views with lighter background have fixed `width`. The middle one is animated and has no `width` and `height` set. All views have `flexBasis` set to the same value.',
              ],
              examples: [
                {
                  flexDirection: 'column',
                  keyframes: {
                    from: { aspectRatio: 0.5 },
                    to: { aspectRatio: 2 },
                  },
                  title: 'Flex column',
                },
                {
                  flexDirection: 'row',
                  keyframes: {
                    from: { aspectRatio: 0.5 },
                    to: { aspectRatio: 2 },
                  },
                  title: 'Flex row',
                },
              ],
              title: 'flexBasis',
            },
          ],
        },
        {
          name: 'flexGrow',
          renderExample: ({ config, flexDirection = 'row', style }) => {
            const boxStyle = [
              styles.box,
              { flexGrow: 1 },
              flexDirection === 'column'
                ? { width: sizes.sm }
                : {
                    height: sizes.sm,
                  },
            ];

            return (
              <View style={{ alignItems: 'center', flexDirection }}>
                <View style={boxStyle} />
                <Animated.View
                  style={[
                    styles.box,
                    { backgroundColor: colors.primaryDark, flexGrow: 2 },
                    style,
                    config,
                  ]}
                />
                <View style={boxStyle} />
              </View>
            );
          },
          sections: [
            {
              description: [
                'On a view with `flexGrow`/`flexShrink`, `aspectRatio` controls the size of the node in the **cross axis** if unset.',
                'Views with lighter background have `flexGrow` set to 1. The middle one is animated and has no `width` and `height` set. The view with a darker background has `flexGrow` set to 2.',
              ],
              examples: [
                {
                  flexDirection: 'column',
                  keyframes: {
                    from: { aspectRatio: 0.5 },
                    to: { aspectRatio: 2 },
                  },
                  title: 'Flex column',
                },
                {
                  flexDirection: 'row',
                  keyframes: {
                    from: { aspectRatio: 0.5 },
                    to: { aspectRatio: 2 },
                  },
                  title: 'Flex row',
                },
              ],
              title: 'flexGrow',
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
  },
});
