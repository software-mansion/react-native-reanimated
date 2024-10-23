import { Pressable, StyleSheet } from 'react-native';
import { colors, iconSizes, radius, sizes, spacing } from '../../theme';
import { Text } from '../core';
import Animated, {
  cubicBezier,
  LinearTransition,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

type CheckboxProps = {
  selected: boolean;
  label?: string;
  onChange: (selected: boolean) => void;
};

export default function CheckBox({ selected, label, onChange }: CheckboxProps) {
  return (
    <Animated.View style={styles.container} layout={LinearTransition}>
      <Pressable style={styles.checkboxRow} onPress={() => onChange(!selected)}>
        <Animated.View
          style={[
            styles.checkbox,
            {
              transitionProperty: 'backgroundColor',
              transitionDuration: '150ms',
              backgroundColor: selected ? colors.primary : colors.background3,
            },
          ]}>
          <Animated.View
            style={[
              {
                transitionProperty: 'all',
                transitionDuration: '200ms',
                transitionTimingFunction: cubicBezier(0.52, 1.78, 0.99, 1.45),
                opacity: selected ? 1 : 0,
                transform: [{ scale: selected ? 1 : 0 }],
              },
            ]}>
            <FontAwesomeIcon
              icon={faCheck}
              color={colors.white}
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
  container: {
    alignItems: 'flex-start',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkbox: {
    width: sizes.xxs,
    height: sizes.xxs,
    backgroundColor: colors.background3,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
