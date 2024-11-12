import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/components';
import { colors, radius, sizes } from '@/theme';

export default function Elevation() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildConfig={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
      })}
      renderExample={({ config }) => (
        <Animated.View style={[styles.box, config]} />
      )}
      sections={[
        {
          description: [
            'Elevation is supported **only on Android**. It serves the same purpose as the combination of `shadowOpacity` and `shadowRadius` on **iOS**.',
            'The only one other working shadow style property on Android is `shadowColor`.',
          ],
          examples: [
            {
              keyframes: {
                from: { elevation: 0 },
                to: { elevation: 25 },
              },
            },
          ],
          labelTypes: ['Android'],
          title: 'Elevation',
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
    shadowColor: colors.primaryDark,
    width: sizes.md,
  },
});
