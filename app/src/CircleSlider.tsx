import React, { useEffect, memo } from 'react';
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
} from 'react-native-svg';
import Animated, {
  runOnJS,
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { mix } from 'react-native-redash';

const BORDER_WIDTH = 25;
const DIAL_RADIUS = 22.5;

export const { PI } = Math;
export const TAU = 2 * PI;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

const polarToCartesian = (
  angle: number,
  radius: number,
  { x, y }: { x: number; y: number }
) => {
  'worklet';
  const a = ((angle - 90) * Math.PI) / 180.0;
  return { x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) };
};

const cartesianToPolar = (
  x: number,
  y: number,
  { x: cx, y: cy }: { x: number; y: number },
  step = 1
) => {
  'worklet';

  const value =
    Math.atan((y - cy) / (x - cx)) / (Math.PI / 180) + (x > cx ? 90 : 270);

  return Math.round(value * (1 / step)) / (1 / step);
};

const unMix = (value: number, x: number, y: number) => {
  'worklet';
  return (value - x) / (y - x);
};

type Props = {
  width: number;
  height: number;
  fillColor: string[];
  value: number;
  meterColor: string;
  min?: number;
  max?: number;
  onValueChange: (value: any) => void;
  children: (
    props: Partial<{ defaultValue: string; text: string }>
  ) => React.ReactNode;
  step?: number;
  decimals?: number;
};

const CircleSlider = (props: Props) => {
  const {
    width,
    height,
    value,
    meterColor,
    children,
    min,
    max,
    step = 1,
    decimals,
  } = props;
  const smallestSide = Math.min(width, height);

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
      x: p2.x - 7.5,
      y: p2.y - 7.5,
    };
  });

  const animatedChildrenProps = useAnimatedProps(() => {
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

    const value = mix(end.value, min! / 360, max! / 360);

    return {
      defaultValue: `${value.toFixed(decimalCount(step))}`,
      text: `${value.toFixed(decimalCount(step))}`,
    };
  });

  const gestureHandler = useAnimatedGestureHandler({
    onActive: ({ x, y }: { x: number; y: number }, ctx: any) => {
      const value = cartesianToPolar(x, y, { x: cx, y: cy }, step);

      ctx.value = mix(value, min! / 360, max! / 360);
      end.value = value;
    },
    onFinish: (_, ctx) => {
      runOnJS(props.onValueChange)(ctx.value);
    },
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View>
        <Svg width={width} height={height}>
          <Circle cx={cx} cy={cy} r={r + BORDER_WIDTH / 2 - 1} fill="blue" />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            strokeWidth={BORDER_WIDTH}
            fill="url(#fill)"
            stroke="rgba(255, 255, 525, 0.2)"
          />
          <AnimatedPath
            stroke={meterColor}
            strokeWidth={BORDER_WIDTH}
            fill="none"
            animatedProps={animatedPath}
          />
          <AnimatedG animatedProps={animatedCircle} onPress={() => {}}>
            <Circle cx={7.5} cy={7.5} r={DIAL_RADIUS} fill={meterColor} />
          </AnimatedG>
        </Svg>
        {children && children(animatedChildrenProps)}
      </Animated.View>
    </PanGestureHandler>
  );
};

export default memo(CircleSlider);

CircleSlider.defaultProps = {
  width: 300,
  height: 300,
  fillColor: ['#fff'],
  meterColor: '#fff',
  min: 0,
  max: 359,
  step: 1,
  onValueChange: (x: any) => x,
};
