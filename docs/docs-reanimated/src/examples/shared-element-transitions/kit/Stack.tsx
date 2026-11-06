import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SCREEN_HEIGHT, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from './Phone';
import { useDemoTheme } from './theme';

export const PUSH_DURATION = 500;
const PUSH_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const PARALLAX = 0.3;

export type StackTop = 'first' | 'second';

export interface ScreenStack {
  progress: SharedValue<number>;
  top: StackTop;
  push: () => void;
  pop: () => void;
  settle: (top: StackTop) => void;
}

export function useScreenStack(
  slowMotion = 1,
  initialTop: StackTop = 'first'
): ScreenStack {
  const progress = useSharedValue(initialTop === 'second' ? 1 : 0);
  const [top, setTop] = useState<StackTop>(initialTop);
  const config = { duration: PUSH_DURATION * slowMotion, easing: PUSH_EASING };

  return {
    progress,
    top,
    push: () => {
      setTop('second');
      progress.value = withTiming(1, config);
    },
    pop: () => {
      setTop('first');
      progress.value = withTiming(0, config);
    },
    settle: setTop,
  };
}

interface StackScreensProps {
  stack: ScreenStack;
  first: React.ReactNode;
  second: React.ReactNode;
}

export function StackScreens({ stack, first, second }: StackScreensProps) {
  const theme = useDemoTheme();

  const firstStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -PARALLAX * SCREEN_WIDTH * stack.progress.value },
    ],
  }));
  const dimStyle = useAnimatedStyle(() => ({
    opacity: stack.progress.value,
  }));
  const secondStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - stack.progress.value) * SCREEN_WIDTH }],
  }));

  return (
    <>
      <Animated.View
        style={[
          styles.screen,
          { backgroundColor: theme.screen },
          interactive(stack.top === 'first'),
          firstStyle,
        ]}>
        {first}
        <Animated.View
          style={[styles.dim, { backgroundColor: theme.dim }, dimStyle]}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.screen,
          styles.pushed,
          { backgroundColor: theme.screen },
          interactive(stack.top === 'second'),
          secondStyle,
        ]}>
        {second}
      </Animated.View>
    </>
  );
}

interface NavHeaderProps {
  title: string;
  onBack: () => void;
  backButtonDisplayMode?: 'default' | 'minimal';
}

export function NavHeader({
  title,
  onBack,
  backButtonDisplayMode = 'default',
}: NavHeaderProps) {
  const theme = useDemoTheme();
  const minimal = backButtonDisplayMode === 'minimal';
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        style={styles.back}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Back">
        <Text
          style={[
            minimal ? styles.backChevron : styles.backText,
            { color: theme.accent },
          ]}>
          {minimal ? '‹' : '‹ Back'}
        </Text>
      </Pressable>
      <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

function interactive(isTop: boolean) {
  return { pointerEvents: isTop ? 'auto' : 'none' } as const;
}

export const HEADER_BOTTOM = STATUS_BAR_HEIGHT + 34;

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    overflow: 'hidden',
  },
  pushed: {
    boxShadow: '-6px 0px 18px rgba(0, 0, 0, 0.12)',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  header: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT,
    left: 0,
    right: 0,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  back: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 13,
    fontWeight: '500',
  },
  backChevron: {
    marginTop: -4,
    fontSize: 26,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});
