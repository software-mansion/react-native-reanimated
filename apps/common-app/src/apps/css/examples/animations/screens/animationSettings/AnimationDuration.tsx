import { StyleSheet, View } from 'react-native';
import type { CSSAnimationProperties } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { Text } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

import { ExampleScreen } from './components';

export default function AnimationDuration() {
  return (
    <ExampleScreen
      animation={{
        animationDuration: '3s',
        animationFillMode: 'backwards',
        animationName: {
          from: {
            width: 0,
          },
          to: {
            width: '100%',
          },
        },
      }}
      cards={[
        {
          items: [
            { animationDuration: '500ms', label: '500ms' },
            { animationDuration: '2s', label: '2s' },
            { animationDuration: 3500, label: '3500' },
          ],
          title: 'Positive Duration',
        },
        {
          description: (
            <>
              If duration is not specified or is set to 0 (0s, 0ms, 0), only one
              frame of the animation will be applied, calculated based on
              <Text
                navLink="Animations/AnimationSettings/FillMode"
                variant="inlineCode">
                animationFillMode
              </Text>
              and
              <Text
                navLink="Animations/AnimationSettings/Direction"
                variant="inlineCode">
                animationDirection
              </Text>
              properties.
            </>
          ),
          items: [{ animationDuration: '0s', label: '0s (default)' }],
          title: 'Zero Duration',
        },
      ]}
      renderExample={(animation: CSSAnimationProperties) => (
        <View style={styles.wrapper}>
          <Animated.View style={[styles.box, animation]} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.sm,
  },
  wrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
});
