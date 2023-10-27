import { TextInput, View, StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
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

function unMix(value: number, x: number, y: number) {
  'worklet';
  return (value - x) / (y - x);
}

type CircleSliderProps = {
  width: number;
  height: number;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  onValueChange?: (value: number) => void;
};

function CircleSlider(props: CircleSliderProps) {
  const {
    width,
    height,
    value,
    min = 0,
    max = 359,
    step = 1,
    decimals,
  } = props;
  const smallestSide = Math.min(width, height);

  const BALL_RADIUS = 20;

  const cx = width / 2;
  const cy = height / 2;
  const r = (smallestSide / 2) * 0.85;

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
      x: p2.x - BALL_RADIUS,
      y: p2.y - BALL_RADIUS,
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

    const value = interpolate(
      end.value,
      [min! / 360, max! / 360],
      [min! / 360, max! / 360]
    );

    const text = `${value.toFixed(decimalCount(step))}`;

    return { text, defaultValue: text };
  });

  const gestureHandler = useAnimatedGestureHandler({
    onActive: ({ x, y }, ctx: { value: number }) => {
      const value = cartesianToPolar(x, y, { x: cx, y: cy }, step);

      ctx.value = interpolate(
        value,
        [min! / 360, max! / 360],
        [min! / 360, max! / 360]
      );
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
          <Svg width={width} height={height}>
            <Circle cx={cx} cy={cy} r={r + 20 / 2 - 1} fill="lightgray" />
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              strokeWidth={20}
              fill="url(#fill)"
              stroke="rgba(255, 255, 255, 0.2)"
            />
            <AnimatedPath
              stroke="white"
              strokeWidth={20}
              fill="none"
              animatedProps={animatedPath}
            />
            <AnimatedG animatedProps={animatedCircle} onPress={() => {}}>
              <Circle
                cx={BALL_RADIUS}
                cy={BALL_RADIUS}
                r={BALL_RADIUS}
                fill="white"
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
        width={300}
        height={300}
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
