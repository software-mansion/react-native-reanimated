import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { WithSpringConfig } from 'react-native-reanimated';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ScrollScreen } from '@/apps/css/components';
import { flex, spacing } from '@/theme';

import SearchBar, { MIN_SEARCH_SHOW_TRANSLATE_Y } from './SearchBar';

const BOUNCE = 0.3; // 0 = no overshoot, 1 = infinite bounce
const DURATION = 0.5; // perceptual duration in seconds (≈ 500 ms)

const rubberBandSpring: WithSpringConfig = {
  stiffness: Math.pow((2 * Math.PI) / DURATION, 2),
  damping: ((1 - BOUNCE) * 4 * Math.PI) / DURATION,
  overshootClamping: false,
  restDisplacementThreshold: 0.1,
  restSpeedThreshold: 4,
};

type SearchScreenProps = {
  children: React.ReactNode;
};

export default function SearchScreen({ children }: SearchScreenProps) {
  const [inputEnabled, setInputEnabled] = useState(false);

  const translateY = useSharedValue(0);
  const searchBarHeight = useSharedValue(0);

  const gesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        if (e.translationY > 0) {
          translateY.value = Math.pow(e.translationY, 0.9);
        }
      })
      .onEnd(() => {
        if (translateY.value > MIN_SEARCH_SHOW_TRANSLATE_Y) {
          runOnJS(setInputEnabled)(true);
          translateY.value = withSpring(
            searchBarHeight.value,
            rubberBandSpring
          );
        } else {
          runOnJS(setInputEnabled)(false);
          translateY.value = withSpring(0, rubberBandSpring);
        }
      });

    const nativeGesture = Gesture.Native();

    return Gesture.Simultaneous(panGesture, nativeGesture);
  }, [translateY, searchBarHeight]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <>
      <SearchBar
        inputEnabled={inputEnabled}
        translateY={translateY}
        onSearch={() => {}}
        onMeasure={(height) => {
          searchBarHeight.value = height;
        }}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[flex.fill, animatedStyle]}>
          <ScrollScreen
            bounces={false}
            contentContainerStyle={styles.scrollViewContent}>
            {children}
          </ScrollScreen>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
