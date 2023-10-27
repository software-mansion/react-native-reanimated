import { TextInput, View, StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import Animated, {
  runOnJS,
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  useAnimatedGestureHandler,
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

function unMix(value: number, x: number, y: number) {
  'worklet';
  return (value - x) / (y - x);
}

type CircleSliderProps = {
  size: number;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  onValueChange?: (value: number) => void;
};

function CircleSlider(props: CircleSliderProps) {
  const { size, value, min = 0, max = 359, step = 1, decimals } = props;
  const CIRCLE_RADIUS = 150;
  const KNOB_RADIUS = 15;
  const PROGRESS_WIDTH = 20;

  const cx = CIRCLE_RADIUS;
  const cy = CIRCLE_RADIUS;
  const r = CIRCLE_RADIUS * 0.85;

  const start = useSharedValue(0);
  const end = useSharedValue(unMix(value, min! / 360, max! / 360));

  useEffect(() => {
    end.value = unMix(value, min! / 360, max! / 360);
  }, [value, end, max, min]);

  const startPos = useDerivedValue(() =>
    polarToCartesian(start.value, r, { x: cx, y: cy })
  );

  const endPos = useDerivedValue(() =>
    polarToCartesian(end.value, r, { x: cx, y: cy })
  );

  const animatedPath = useAnimatedProps(() => {
    const p1 = startPos.value;
    const p2 = endPos.value;
    return {
      d: `M${p1.x} ${p1.y} A ${r} ${r} 0 ${end.value > 180 ? 1 : 0} 1 ${p2.x} ${
        p2.y
      }`,
    };
  });

  const animatedCircle = useAnimatedProps(() => {
    const p2 = endPos.value;
    return {
      x: p2.x - KNOB_RADIUS,
      y: p2.y - KNOB_RADIUS,
    };
  });

  const animatedInputProps = useAnimatedProps(() => {
    const decimalCount = (num: number) => {
      if (decimals) {
        return decimals;
      }
      const numStr = String(num);
      if (numStr.includes('.')) {
        return numStr.split('.')[1].length;
      }
      return 0;
    };

    const value = end.value;

    const text = `${value.toFixed(decimalCount(step))}`;

    return { text, defaultValue: text };
  });

  const gestureHandler = useAnimatedGestureHandler({
    onActive: ({ x, y }, ctx: { value: number }) => {
      const value = cartesianToPolar(x, y, { x: cx, y: cy }, step);
      ctx.value = value;
      end.value = value;
    },
    onFinish: (_, ctx) => {
      if (props.onValueChange) {
        runOnJS(props.onValueChange)(ctx.value);
      }
    },
  });

  return (
    <>
      <PanGestureHandler onGestureEvent={gestureHandler} minDist={0}>
        <Animated.View>
          <Svg width={size} height={size}>
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              strokeWidth={PROGRESS_WIDTH}
              fill="none"
              stroke="lightgray"
            />
            <AnimatedPath
              stroke="lime"
              strokeWidth={PROGRESS_WIDTH}
              fill="none"
              animatedProps={animatedPath}
            />
            <AnimatedG animatedProps={animatedCircle}>
              <Circle
                cx={KNOB_RADIUS}
                cy={KNOB_RADIUS}
                r={KNOB_RADIUS}
                fill="blue"
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
      <CircleSlider
        size={300}
        value={45}
        onValueChange={(value) => console.log(value)}
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
