import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View, SafeAreaView } from 'react-native';

import React, { useEffect, useCallback, useState } from 'react';
import Animated, {
  useSharedValue,
  Easing,
  interpolate,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import Svg, { G, Rect } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

export type PulseEffectProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
};

const HEIGHT_MLTR = 1.5;
const WIDTH_MLTR = 1.2;

const Pulse = ({ children, style, borderRadius = 0 }: PulseEffectProps) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const animation = useSharedValue(0);
  useEffect(() => {
    animation.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 5000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, { duration: 0 })
      ),
      -1
    );
  }, [layout, animation]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const rectAnimatedProps = useAnimatedProps(() => {
    const scaledW = interpolate(
      animation.value,
      [0, 1],
      [layout.width, layout.width * WIDTH_MLTR]
    );
    const scaledH = interpolate(
      animation.value,
      [0, 1],
      [layout.height, layout.height * HEIGHT_MLTR]
    );
    const diffX = layout.width * WIDTH_MLTR - layout.width;
    const diffY = layout.height * HEIGHT_MLTR - layout.height;
    const x = interpolate(animation.value, [0, 1], [diffX / 2, 0]);
    const y = interpolate(animation.value, [0, 1], [diffY / 2, 0]);
    return {
      width: scaledW,
      height: scaledH,
      x,
      y,
      rx: borderRadius,
      ry: borderRadius,
    };
  });

  const gAnimatedProps = useAnimatedProps(() => ({
    opacity: interpolate(animation.value, [0, 1], [0.5, 0]),
  }));

  const svgWidth = layout.width * WIDTH_MLTR;
  const svgHeight = layout.height * HEIGHT_MLTR;

  return (
    <View style={style} onLayout={onLayout}>
      {layout.width > 0 && layout.height > 0 && (
        <Svg
          pointerEvents="none"
          style={[
            styles.effect,
            { top: -(svgHeight - layout.height) / 2 },
            { left: -(svgWidth - layout.width) / 2 },
          ]}
          width={svgWidth}
          height={svgHeight}>
          <AnimatedG animatedProps={gAnimatedProps}>
            <AnimatedRect fill="red" animatedProps={rectAnimatedProps} />
          </AnimatedG>
        </Svg>
      )}
      {children}
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Pulse>
        <View style={styles.rect} />
      </Pulse>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
  rect: {
    width: 100,
    height: 50,
    borderWidth: 1,
  },
  effect: {
    ...StyleSheet.absoluteFillObject,
  },
});
