import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen, Scroll, Text } from '@/apps/css/components';
import { colors, radius, spacing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CARDS = [
  {
    actions: [
      { color: '#0047FF', doneIcon: '♥', icon: '♡', label: 'Like' },
      { color: '#0090FF', doneIcon: '★', icon: '☆', label: 'Star' },
      { color: '#00AAFF', doneIcon: '◆', icon: '◇', label: 'Collect' },
    ],
    color: '#0047FF',
    icon: '✦',
    title: 'Quick Actions',
  },
  {
    actions: [
      { color: '#001EA8', doneIcon: '↻', icon: '↺', label: 'Repost' },
      { color: '#003DCC', doneIcon: '⊠', icon: '⊡', label: 'Bookmark' },
      { color: '#0066DD', doneIcon: '●', icon: '◯', label: 'Pin' },
    ],
    color: '#001EA8',
    icon: '◈',
    title: 'Share & Save',
  },
  {
    actions: [
      { color: '#002299', doneIcon: '♥', icon: '♡', label: 'Love' },
      { color: '#0055EE', doneIcon: '★', icon: '☆', label: 'Wow' },
      { color: '#0077CC', doneIcon: '◆', icon: '◇', label: 'Support' },
    ],
    color: '#0077CC',
    icon: '❋',
    title: 'Reactions',
  },
];

function ActionButton({
  active,
  color,
  doneIcon,
  icon,
  label,
  onToggle,
}: {
  label: string;
  icon: string;
  doneIcon: string;
  color: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <AnimatedPressable
      style={[
        styles.actionBtn,
        {
          backgroundColor: {
            ':active': color + '22',
            ':hover': color + '08',
            default: '#fafafa00',
          },
          borderColor: {
            ':hover': color,
            default: active ? color : colors.background3,
          },
          shadowColor: color,
          shadowOpacity: { ':hover': 0.2, default: active ? 0.4 : 0 },
          transform: {
            ':active': [{ scale: 0.95 }],
            ':hover': [{ scale: 0.97 }],
            default: [{ scale: 1 }],
          },
          transitionDuration: '200ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}
      onPress={onToggle}>
      <Text
        style={{ color: active ? color : colors.foreground2 }}
        variant="label2">
        {active ? doneIcon : icon}
        {'  '}
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function Card({
  actions,
  color,
  icon,
  title,
}: {
  title: string;
  icon: string;
  color: string;
  actions: Array<{
    label: string;
    icon: string;
    doneIcon: string;
    color: string;
  }>;
}) {
  const [toggled, setToggled] = useState<string | null>(null);
  return (
    <Animated.View
      style={[
        styles.card,
        {
          height: { ':hover': 248, default: 52 },
          shadowOpacity: { ':hover': 0.12, default: 0.05 },
          transitionDuration: '300ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}>
      <Text style={{ color }} variant="label1">
        {icon}
        {'  '}
        {title}
      </Text>
      <View style={styles.actions}>
        {actions.map((a) => (
          <ActionButton
            key={a.label}
            {...a}
            active={toggled === a.label}
            onToggle={() => setToggled(a.label)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

export default function Showcase() {
  return (
    <Screen>
      <Scroll contentContainerStyle={styles.content} withBottomBarSpacing>
        {CARDS.map((c) => (
          <Card key={c.title} {...c} />
        ))}
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    elevation: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowOffset: { height: 0, width: 0 },
    shadowRadius: 12,
  },
  actions: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.background1,
    borderColor: colors.background3,
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 4,
    gap: spacing.md,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    shadowColor: colors.black,
    shadowOffset: { height: 4, width: 0 },
    shadowRadius: 16,
    width: '100%',
  },
  content: {
    gap: spacing.sm,
  },
});
