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
import { Circle, Path, Polygon, Rect, Svg } from 'react-native-svg';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function TextInputDemo({ sv }: { sv: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(sv.value * 100)}`,
      defaultValue: `${Math.round(sv.value * 100)}`,
    };
  }, []);

  return (
    <View style={styles.demo}>
      <Text style={styles.text}>AnimatedTextInput</Text>
      <AnimatedTextInput
        animatedProps={animatedProps}
        style={styles.input}
        editable={false}
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

const AnimatedPolygonJSProps = Animated.createAnimatedComponent(Polygon, {
  jsProps: ['points'],
});

const AnimatedPolygonNoJSProps = Animated.createAnimatedComponent(Polygon);

function SvgPolygonsDemo({ sv }: { sv: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    const topY = 75 - sv.value * 50;
    const leftX = 25 + sv.value * 15;
    const rightX = 75 - sv.value * 15;

    return {
      points: `50 ${topY}, ${leftX} 125, ${rightX} 125`, // this is a JS prop
      stroke: interpolateColor(sv.value, [0, 1], ['black', 'white'], 'HSV'),
    };
  }, []);

  return (
    <View style={styles.demo}>
      <Text style={styles.text}>With vs without JS props</Text>
      <Text>
        Both components use the same animated props, but only the shape of the
        left one is animated, because the &apos;points&apos; property is a JS
        prop and only this component specified &apos;points&apos; as the JS
        prop.
      </Text>
      <Svg height="200" width="200">
        <AnimatedPolygonJSProps
          fill="lime"
          x={0}
          strokeWidth={10}
          animatedProps={animatedProps}
        />
        <AnimatedPolygonNoJSProps
          fill="red"
          x={100}
          strokeWidth={10}
          animatedProps={animatedProps}
        />
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

export default function ThirdPartyComponentsExample() {
  const sv = useLoop();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInputDemo sv={sv} />
      <SvgCircleDemo sv={sv} />
      <SvgRectDemo sv={sv} />
      <SvgPathDemo sv={sv} />
      <SvgPolygonsDemo sv={sv} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  demo: {
    borderWidth: 1,
    padding: 20,
    width: '100%',
    alignItems: 'center',
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
