import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Circle, G, Path, Rect, Svg } from 'react-native-svg';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function TextInputDemo({ sv }: { sv: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(sv.value * 100)}`,
    };
  }, []);

  return (
    <View style={styles.demo}>
      <Text style={styles.text}>AnimatedTextInput</Text>
      <AnimatedTextInput
        // @ts-expect-error it works
        animatedProps={animatedProps}
        style={styles.input}
      />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function SvgCircleDemo({ sv }: { sv: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    return {
      cx: sv.value * 100,
      cy: sv.value * 100,
      r: sv.value * 100,
      opacity: sv.value,
      fill: interpolateColor(sv.value, [0, 1], ['red', 'lime'], 'HSV'),
      stroke: interpolateColor(sv.value, [0, 1], ['black', 'white'], 'HSV'),
    };
  }, []);

  return (
    <View style={styles.demo}>
      <Text style={styles.text}>AnimatedCircle</Text>
      <Svg height="200" width="200">
        <AnimatedCircle strokeWidth={20} animatedProps={animatedProps} />
      </Svg>
    </View>
  );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function SvgRectDemo({ sv }: { sv: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    return {
      x: sv.value * 100,
      y: sv.value * 100,
      width: sv.value * 100,
      height: sv.value * 100,
      opacity: sv.value,
      fill: interpolateColor(sv.value, [0, 1], ['red', 'lime'], 'HSV'),
      stroke: interpolateColor(sv.value, [0, 1], ['black', 'white'], 'HSV'),
    };
  }, []);

  return (
    <View style={styles.demo}>
      <Text style={styles.text}>AnimatedRect</Text>
      <Svg height="200" width="200">
        <AnimatedRect strokeWidth={20} animatedProps={animatedProps} />
      </Svg>
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

function SvgPathDemo({ sv }: { sv: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    return {
      d: `M 0 0 C 50 ${sv.value * 200}, 150 ${sv.value * 200}, 200 0`,
      stroke: interpolateColor(sv.value, [0, 1], ['red', 'lime'], 'HSV'),
    };
  }, []);

  return (
    <View style={styles.demo}>
      <Text style={styles.text}>AnimatedPath</Text>
      <Svg height="200" width="200">
        <AnimatedPath
          strokeWidth={10}
          fill="none"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const AnimatedG = Animated.createAnimatedComponent(G);

function SvgGDemo({ sv }: { sv: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    return {
      x: sv.value * 200,
      y: Math.sin(sv.value * Math.PI) * 200,
    };
  }, []);

  return (
    <View style={styles.demo}>
      <Text style={styles.text}>AnimatedG</Text>
      <Svg height="200" width="200">
        <AnimatedG animatedProps={animatedProps}>
          <Circle cx={0} cy={0} r={20} fill="black" />
        </AnimatedG>
      </Svg>
    </View>
  );
}

function useLoop() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }),
      -1
    );
  });

  return sv;
}

export default function App() {
  const sv = useLoop();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInputDemo sv={sv} />
      <SvgCircleDemo sv={sv} />
      <SvgRectDemo sv={sv} />
      <SvgPathDemo sv={sv} />
      <SvgGDemo sv={sv} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demo: {
    borderWidth: 1,
  },
  text: {
    textAlign: 'center',
  },
  input: {
    fontSize: 100,
    textAlign: 'center',
    width: 200,
  },
});
