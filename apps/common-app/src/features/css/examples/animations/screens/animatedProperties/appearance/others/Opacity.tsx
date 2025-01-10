import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function Opacity() {
  return (
    <ExamplesScreen
      CardComponent={VerticalExampleCard}
      buildAnimation={() => ({
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: {
          to: {
            opacity: 0,
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
              title: 'Changing Opacity',
            },
          ],
          title: 'Opacity',
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
});
