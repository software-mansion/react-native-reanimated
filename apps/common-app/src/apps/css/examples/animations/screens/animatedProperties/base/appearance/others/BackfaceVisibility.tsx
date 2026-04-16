import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function BackfaceVisibility() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '4s',
        animationIterationCount: 'infinite',
        animationName: {
          '50%': {
            backfaceVisibility: 'visible',
          },
          '75%': {
            backfaceVisibility: 'hidden',
          },
          // eslint-disable-next-line perfectionist/sort-objects
          '100%': {
            backfaceVisibility: 'visible',
            transform: [{ perspective: 100 }, { rotateY: '180deg' }],
          },
        },
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      sections={[
        {
          examples: [
            {
              description: [
                "`backfaceVisibility`, if set to `'hidden'`, makes the component invisible if it is rotated in such a way that its back is visible to the user.",
                'In the example below we can see that the view becomes invisible when it is rotated by more than 90 degrees and the `backfaceVisibility` in animation changes to `hidden`.',
              ],
              title: 'Changing Backface Visibility',
            },
          ],
          title: 'Backface Visibility',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.lg,
    width: sizes.lg,
  },
});
