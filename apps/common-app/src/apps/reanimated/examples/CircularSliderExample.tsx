import React from 'react';
import type { ColorValue } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Point {
  x: number;
  y: number;
}

function polarToCartesian(angle: number, radius: number, center: Point) {
  'worklet';
  const a = ((angle - 90) * Math.PI) / 180;
  return {
    x: center.x + radius * Math.cos(a),
    y: center.y + radius * Math.sin(a),
  };
}

function cartesianToPolar(point: Point, center: Point) {
  'worklet';
  return (
    Math.atan((point.y - center.y) / (point.x - center.x)) / (Math.PI / 180) +
    (point.x > center.x ? 90 : 270)
  );
}

function valueToAngle(value: number, min: number, max: number) {
  'worklet';
  return interpolate(value, [min, max], [0, 360]);
}

function angleToValue(angle: number, min: number, max: number) {
  'worklet';
  return interpolate(angle, [0, 360], [min, max]);
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
    onValueChange,
  } = props;

  const center = { x: size / 2, y: size / 2 };

  const currentAngle = useSharedValue(valueToAngle(value, min, max));

  const currentValue = useDerivedValue(() =>
    Math.floor(angleToValue(currentAngle.value, min, max))
  );

  const knobPosition = useDerivedValue(() =>
    polarToCartesian(currentAngle.value, circleRadius, center)
  );

  const start = polarToCartesian(0, circleRadius, center);

  const animatedPathProps = useAnimatedProps(() => {
    const end = knobPosition.value;
    return {
      d: `M${start.x} ${start.y} A ${circleRadius} ${circleRadius} 0 ${
        currentAngle.value > 180 ? 1 : 0
      } 1 ${end.x} ${end.y}`,
    };
  });

  const animatedKnobProps = useAnimatedProps(() => {
    const p = knobPosition.value;
    return {
      cx: p.x,
      cy: p.y,
    };
  });

  const animatedProps = useAnimatedProps(() => {
    return { text: String(currentValue.value) };
  });

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onUpdate(({ x, y }) => {
      currentAngle.value = cartesianToPolar({ x, y }, center);
    })
    .onFinalize(() => {
      if (onValueChange) {
        scheduleOnRN(onValueChange, currentValue.value);
      }
    });

  return (
    <>
      <GestureDetector gesture={gesture}>
        <Animated.View>
          <Svg width={size} height={size}>
            <Circle
              cx={center.x}
              cy={center.y}
              r={circleRadius}
              stroke={trackLineColor}
              strokeWidth={trackLineWidth}
              fill="none"
            />
            <AnimatedPath
              stroke={progressLineColor}
              strokeWidth={progressLineWidth}
              fill="none"
              animatedProps={animatedPathProps}
            />
            <AnimatedCircle
              r={knobRadius}
              fill={knobColor}
              animatedProps={animatedKnobProps}
            />
          </Svg>
        </Animated.View>
      </GestureDetector>
      <Animated.Text animatedProps={animatedProps} style={styles.text} />
    </>
  );
}

export default function CircularSliderExample() {
  return (
    <View style={styles.container}>
      <CircularSlider
        size={300}
        circleRadius={120}
        knobRadius={20}
        knobColor="black"
        progressLineWidth={20}
        progressLineColor="gold"
        trackLineWidth={10}
        trackLineColor="lightgray"
        value={20}
        min={0}
        max={100}
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
  text: {
    fontSize: 80,
    fontVariant: ['tabular-nums'],
    position: 'absolute',
    color: 'black',
    pointerEvents: 'none',
    textAlign: 'center',
  },
});
