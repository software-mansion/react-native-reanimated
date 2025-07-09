import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function End() {
  return (
    <ExamplesScreen<{ direction: 'ltr' | 'rtl' }>
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            end: 0,
          },
          to: {
            end: '20%',
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation, direction }) => (
        <View style={[styles.container, { direction }]}>
          <Animated.View style={[styles.box, animation]} />
        </View>
      )}
      sections={[
        {
          description: 'In all examples below the box position is `absolute`.',
          examples: [
            {
              description:
                'When layout direction is `ltr`, `end` is the right edge of the element and works as if the `right` property was set.',
              direction: 'ltr',
              title: 'Left to Right Layout',
            },
            {
              description:
                'When layout direction is `rtl`, `end` is the left edge of the element and works as if the `left` property was set.',
              direction: 'rtl',
              title: 'Right to Left Layout',
            },
          ],
          labelTypes: ['iOS', 'Android'],
          title: 'End',
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
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: '-50%' }],
    width: sizes.md,
  },
  container: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    flexDirection: 'row',
    height: sizes.lg,
    width: 4 * sizes.md,
  },
});
