import { useEffect, useMemo } from 'react';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { SharedValue, WithSpringConfig } from 'react-native-reanimated';
import Animated, {
  Extrapolation,
  interpolate,
  makeMutable,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { flex } from '@/theme';

const SPRING: WithSpringConfig = { stiffness: 140, damping: 22, mass: 0.6 };

enum HeaderState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  TRANSITIONING = 'TRANSITIONING',
}

type ExpandableHeaderScreenProps = Omit<ScrollViewProps, 'ref' | 'onScroll'> & {
  header: React.ReactElement | null | undefined;
  headerContainerStyle?: StyleProp<ViewStyle>;
  headerShowProgress?: SharedValue<number>;
};

export default function ExpandableHeaderScreen({
  header,
  headerContainerStyle,
  headerShowProgress: headerShowProgress_,
  ...rest
}: ExpandableHeaderScreenProps) {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const headerHeight = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const translateY = useSharedValue(0);

  const totalOffsetY = useDerivedValue(() => offsetY.value - translateY.value);
  const headerShowProgress = useMemo(
    () => headerShowProgress_ ?? makeMutable(0),
    [headerShowProgress_]
  );

  useAnimatedReaction(
    () => totalOffsetY.value,
    (value) => {
      headerShowProgress.value = interpolate(
        -value,
        [0, headerHeight.value],
        [0, 1],
        Extrapolation.CLAMP
      );
    }
  );

  const scrollHandler = useAnimatedScrollHandler<{
    state: HeaderState;
    dragEndOffsetY: number | null;
    dragEndTranslateY: number | null;
  }>({
    onBeginDrag: (_, ctx) => {
      ctx.state = HeaderState.TRANSITIONING;
      ctx.dragEndOffsetY = null;
      ctx.dragEndTranslateY = null;
    },
    onScroll: ({ contentOffset: { y } }, ctx) => {
      offsetY.value =
        ctx.state !== HeaderState.CLOSED || headerShowProgress.value > 0
          ? Math.min(y, 0)
          : 0;

      if (ctx.state === HeaderState.OPEN && y < 0) {
        ctx.dragEndOffsetY ??= y;
        ctx.dragEndTranslateY ??= translateY.value;
        translateY.value = interpolate(
          y,
          [ctx.dragEndOffsetY, 0],
          [ctx.dragEndTranslateY, headerHeight.value],
          Extrapolation.CLAMP
        );
      } else if (
        ctx.state !== HeaderState.CLOSED &&
        translateY.value > 0 &&
        y > 0
      ) {
        translateY.value -= y;
        scrollTo(scrollViewRef, 0, 0, false);
      }
    },
    onEndDrag: (_, ctx) => {
      if (headerShowProgress.value === 1) {
        ctx.state = HeaderState.OPEN;
      } else {
        ctx.state = HeaderState.CLOSED;
        translateY.value = withSpring(0, SPRING);
      }
    },
    onMomentumEnd: (_, ctx) => {
      const target = ctx.state === HeaderState.OPEN ? headerHeight.value : 0;
      if (Math.abs(target - translateY.value) > 1) {
        translateY.value = withSpring(target, SPRING);
      } else {
        translateY.value = target;
      }
    },
  });

  const animatedHeaderContainerStyle = useAnimatedStyle(() => ({
    height: Math.max(0, -totalOffsetY.value),
  }));

  const animatedScrollViewStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={flex.fill}>
      <Animated.View
        style={[
          styles.headerContainer,
          headerContainerStyle,
          animatedHeaderContainerStyle,
        ]}>
        <View
          onLayout={({ nativeEvent: { layout } }) => {
            headerHeight.value = layout.height;
          }}>
          {header}
        </View>
      </Animated.View>
      <Animated.ScrollView
        {...rest}
        ref={scrollViewRef}
        style={[rest.style, animatedScrollViewStyle]}
        onScroll={scrollHandler}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
