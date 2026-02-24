import { isValidElement, useEffect, useMemo } from 'react';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { AnimatedRef, WithSpringConfig } from 'react-native-reanimated';
import Animated, {
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useScrollOffset,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { flex } from '@/theme';
import { IS_WEB } from '@/utils';

const SPRING: WithSpringConfig = { damping: 22, mass: 0.6, stiffness: 140 };

enum HeaderState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  TRANSITIONING = 'TRANSITIONING',
}

export enum ExpandMode {
  EXPANDED = 'EXPANDED',
  COLLAPSED = 'COLLAPSED',
  AUTO = 'AUTO',
}

type ExpandableHeaderScreenProps = {
  HeaderComponent: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  React.ComponentType<any> | React.ReactElement | null | undefined;
  expandMode?: ExpandMode;
  headerContainerStyle?: StyleProp<ViewStyle>;
  children?:
    | React.ReactNode
    | ((
        props: Pick<ScrollViewProps, 'onScroll'> & {
          ref: AnimatedRef;
        }
      ) => React.ReactNode);
  onHeaderShowProgressChange?: (progress: number) => void;
};

export default function ExpandableHeaderScreen({
  children,
  expandMode,
  HeaderComponent,
  headerContainerStyle,
  onHeaderShowProgressChange,
}: ExpandableHeaderScreenProps) {
  const scrollableRef = useAnimatedRef();
  const offsetY = useSharedValue(0);
  const headerHeight = useSharedValue(IS_WEB ? 72 : 0);
  const translateY = useSharedValue(IS_WEB ? 72 : 0);
  const dragStartTranslateY = useSharedValue<number | null>(null);
  const isScrolling = useSharedValue(false);
  const scrollOffsetY = useScrollOffset(scrollableRef);

  const totalOffsetY = useDerivedValue(() => offsetY.value - translateY.value);
  const headerShowProgress = useSharedValue(0);

  const expandEnabled = expandMode === ExpandMode.AUTO;
  const isExpanded = expandMode === ExpandMode.EXPANDED;

  useEffect(() => {
    if (!expandEnabled) {
      translateY.value =
        expandMode === ExpandMode.EXPANDED ? headerHeight.value : 0;
      offsetY.value = 0;
    }
  }, [expandMode, expandEnabled, headerHeight, offsetY, translateY]);

  useAnimatedReaction(
    () => totalOffsetY.value,
    (value) => {
      headerShowProgress.value = interpolate(
        -value,
        [0, headerHeight.value],
        [0, 1],
        Extrapolation.CLAMP
      );
      onHeaderShowProgressChange?.(headerShowProgress.value);
    }
  );

  const scrollHandler = useAnimatedScrollHandler<{
    state: HeaderState;
    dragEndOffsetY: number | null;
  }>({
    onBeginDrag: (_, ctx) => {
      ctx.state = HeaderState.TRANSITIONING;
      ctx.dragEndOffsetY = null;
      dragStartTranslateY.value = null;
      isScrolling.value = true;
    },
    onEndDrag: (_, ctx) => {
      isScrolling.value = false;
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
    onScroll: ({ contentOffset: { y } }, ctx) => {
      offsetY.value =
        ctx.state !== HeaderState.CLOSED || headerShowProgress.value > 0
          ? Math.min(y, 0)
          : 0;

      if (ctx.state === HeaderState.OPEN && y < 0) {
        ctx.dragEndOffsetY ??= y;
        dragStartTranslateY.value ??= translateY.value;
        translateY.value = interpolate(
          y,
          [ctx.dragEndOffsetY, 0],
          [dragStartTranslateY.value, headerHeight.value],
          Extrapolation.CLAMP
        );
      } else if (
        ctx.state !== HeaderState.CLOSED &&
        translateY.value > 0 &&
        y > 0
      ) {
        translateY.value -= y;
        scrollTo(scrollableRef, 0, 0, false);
      }
    },
  });

  const gesture = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Native(),
        Gesture.Pan()
          .onBegin(() => {
            dragStartTranslateY.value = null;
          })
          .onChange((e) => {
            dragStartTranslateY.value ??= translateY.value;
            if (e.translationY > 0 && scrollOffsetY.value === 0) {
              translateY.value =
                (dragStartTranslateY.value ?? 0) +
                Math.pow(e.translationY, 0.9);
            } else if (
              !isScrolling.value &&
              e.translationY < 0 &&
              translateY.value > 0 &&
              scrollOffsetY.value === 0
            ) {
              translateY.value = Math.max(
                0,
                dragStartTranslateY.value + e.translationY
              );
            }
          })
          .onEnd(() => {
            if (scrollOffsetY.value < 0 || isScrolling.value) {
              return;
            }

            if (headerShowProgress.value === 1) {
              translateY.value = withSpring(headerHeight.value, SPRING);
            } else {
              translateY.value = withSpring(0, SPRING);
            }
          })
          .enabled(expandEnabled)
      ),
    [
      dragStartTranslateY,
      expandEnabled,
      headerHeight,
      headerShowProgress,
      isScrolling,
      scrollOffsetY,
      translateY,
    ]
  );

  const animatedHeaderContainerStyle = useAnimatedStyle(() => ({
    height: Math.max(0, -totalOffsetY.value),
  }));

  const animatedContentContainerStyle = useAnimatedStyle(() => ({
    paddingBottom: isExpanded ? headerHeight.value : 0,
    transform: [{ translateY: translateY.value }],
  }));

  const header = useMemo(() => {
    if (!HeaderComponent || isValidElement(HeaderComponent)) {
      return HeaderComponent;
    }
    return <HeaderComponent />;
  }, [HeaderComponent]);

  const content = useMemo(() => {
    if (typeof children === 'function') {
      return children({
        onScroll: expandEnabled ? scrollHandler : undefined,
        ref: scrollableRef,
      });
    }
    return children;
  }, [children, expandEnabled, scrollableRef, scrollHandler]);

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
            if (layout.height > 0) {
              headerHeight.value = layout.height;
            }
          }}>
          {header}
        </View>
      </Animated.View>
      <Animated.View style={[flex.fill, animatedContentContainerStyle]}>
        {isExpanded ? (
          content
        ) : (
          <GestureDetector gesture={gesture}>{content}</GestureDetector>
        )}
      </Animated.View>
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
