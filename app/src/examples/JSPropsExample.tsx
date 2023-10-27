import { TextInput, View, StyleSheet, ColorValue } from 'react-native';
import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import Animated, {
  runOnJS,
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  useAnimatedGestureHandler,
  interpolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

interface Point {
  x: number;
  y: number;
}

function polarToCartesian(angle: number, radius: number, { x, y }: Point) {
  'worklet';
  const a = ((angle - 90) * Math.PI) / 180.0;
  return { x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) };
}

function cartesianToPolar(
  x: number,
  y: number,
  { x: cx, y: cy }: Point,
  step = 1
) {
  'worklet';
  const value =
    Math.atan((y - cy) / (x - cx)) / (Math.PI / 180) + (x > cx ? 90 : 270);
  return Math.round(value * (1 / step)) / (1 / step);
}

function valueToProgress(value: number, min: number, max: number) {
  'worklet';
  return interpolate(value, [min, max], [0, 360]);
}

function progressToValue(progress: number, min: number, max: number) {
  'worklet';
  return interpolate(progress, [0, 1], [min, max]);
}

type CircularSliderProps = {
  size: number;
  circleRadius: number;
  knobRadius: number;
  knobColor: ColorValue;
  progressLineWidth: number;
  progressLineColor: ColorValue;
  trackLineWidth: number;
  trackLineColor: ColorValue;

  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange?: (value: number) => void;
};

function CircularSlider(props: CircularSliderProps) {
  const {
    size,
    circleRadius,
    knobRadius,
    knobColor,
    progressLineWidth,
    progressLineColor,
    trackLineWidth,
    trackLineColor,

    value,
    min,
    max,
    step = 1,
  } = props;

  const CENTER = { x: size / 2, y: size / 2 };

  const angle = useSharedValue(valueToProgress(value, min, max));

  const currentValue = useDerivedValue(() =>
    Math.floor(progressToValue(angle.value / 360, min, max))
  );

  const knobPosition = useDerivedValue(() =>
    polarToCartesian(angle.value, circleRadius, CENTER)
  );

  const animatedPath = useAnimatedProps(() => {
    const p1 = polarToCartesian(0, circleRadius, CENTER);
    const p2 = knobPosition.value;
    return {
      d: `M${p1.x} ${p1.y} A ${circleRadius} ${circleRadius} 0 ${
        angle.value > 180 ? 1 : 0
      } 1 ${p2.x} ${p2.y}`,
    };
  });

  const animatedCircle = useAnimatedProps(() => {
    const p = knobPosition.value;
    return {
      x: p.x - knobRadius,
      y: p.y - knobRadius,
    };
  });

  const animatedInputProps = useAnimatedProps(() => {
    const text = String(currentValue.value);
    return { text, defaultValue: text };
  });

  const gestureHandler = useAnimatedGestureHandler({
    onActive: ({ x, y }) => {
      angle.value = cartesianToPolar(x, y, CENTER, step);
    },
    onFinish: () => {
      if (props.onValueChange) {
        runOnJS(props.onValueChange)(currentValue.value);
      }
    },
  });

  return (
    <>
      <PanGestureHandler onGestureEvent={gestureHandler} minDist={10}>
        <Animated.View>
          <Svg width={size} height={size}>
            <Circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={circleRadius}
              stroke={trackLineColor}
              strokeWidth={trackLineWidth}
              fill="none"
            />
            <AnimatedPath
              stroke={progressLineColor}
              strokeWidth={progressLineWidth}
              fill="none"
              animatedProps={animatedPath}
            />
            <AnimatedG animatedProps={animatedCircle}>
              <Circle
                cx={knobRadius}
                cy={knobRadius}
                r={knobRadius}
                fill={knobColor}
              />
            </AnimatedG>
          </Svg>
        </Animated.View>
      </PanGestureHandler>
      <AnimatedInput
        editable={false}
        animatedProps={animatedInputProps}
        style={styles.input}
      />
    </>
  );
}

export default function JSPropsExample() {
  return (
    <View style={styles.container}>
      <CircularSlider
        size={300}
        circleRadius={120}
        knobRadius={15}
        knobColor="green"
        progressLineWidth={20}
        progressLineColor="lime"
        trackLineWidth={10}
        trackLineColor="lightgray"
        value={120}
        min={0}
        max={359}
        onValueChange={console.log}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontVariant: ['tabular-nums'],
  },
});
