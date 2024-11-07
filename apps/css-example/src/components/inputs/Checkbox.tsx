import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  cubicBezier,
  LinearTransition,
} from 'react-native-reanimated';

import { Text } from '@/components/core';
import { colors, iconSizes, radius, sizes, spacing } from '@/theme';

type CheckboxProps = {
  selected: boolean;
  label?: string;
  onChange: (selected: boolean) => void;
};

export default function CheckBox({ label, onChange, selected }: CheckboxProps) {
  return (
    <Animated.View layout={LinearTransition} style={styles.container}>
      <Pressable style={styles.checkboxRow} onPress={() => onChange(!selected)}>
        <Animated.View
          style={[
            styles.checkbox,
            {
              backgroundColor: selected ? colors.primary : colors.background3,
              transitionDuration: '150ms',
              transitionProperty: 'backgroundColor',
            },
          ]}>
          <Animated.View
            style={[
              {
                opacity: selected ? 1 : 0,
                transform: [{ scale: selected ? 1 : 0 }],
                transitionDuration: '200ms',
                transitionProperty: 'all',
                transitionTimingFunction: cubicBezier(0.52, 1.78, 0.99, 1.45),
              },
            ]}>
            <FontAwesomeIcon
              color={colors.white}
              icon={faCheck}
              size={iconSizes.xs}
            />
          </Animated.View>
        </Animated.View>
        <Text variant="label3">{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    backgroundColor: colors.background3,
    borderRadius: radius.xs,
    height: sizes.xxs,
    justifyContent: 'center',
    width: sizes.xxs,
  },
  checkboxRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  container: {
    alignItems: 'flex-start',
  },
});
