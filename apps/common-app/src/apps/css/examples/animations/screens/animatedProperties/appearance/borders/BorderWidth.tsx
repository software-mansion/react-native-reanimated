import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function BorderWidth() {
  return (
    <ExamplesScreen<{ propertyName: string }>
      buildAnimation={({ propertyName }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            [propertyName]: 0,
          },
          to: {
            [propertyName]: sizes.xs,
          },
        },
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      sections={[
        {
          examples: [
            {
              propertyName: 'borderWidth',
              title: 'borderWidth',
            },
          ],
          title: 'All Edges',
        },
        {
          examples: [
            {
              propertyName: 'borderTopWidth',
              title: 'borderTopWidth',
            },
            {
              description: ['(or borderEndWidth)'],
              propertyName: 'borderRightWidth',
              title: 'borderRightWidth',
            },
            {
              propertyName: 'borderBottomWidth',
              title: 'borderBottomWidth',
            },
            {
              description: ['(or borderStartWidth)'],
              propertyName: 'borderLeftWidth',
              title: 'borderLeftWidth',
            },
          ],
          title: 'Single Edge',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderRadius: radius.sm,
    height: sizes.lg,
    width: sizes.lg,
  },
});
