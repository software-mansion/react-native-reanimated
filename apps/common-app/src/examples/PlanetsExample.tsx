import React, { useEffect, useState } from 'react';
import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Ellipse, Path, Svg } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

Animated.addWhitelistedNativeProps({ cx: true, cy: true });

function useLoop(toValue: number = 1, duration: number = 1000) {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(
      withTiming(toValue, { duration, easing: Easing.linear }),
      -1
    );
  }, [sv, toValue, duration]);

  return sv;
}

const baseDuration = 6000;
const baseSemiMajorAxeLength = 3 * 25;

function getDurationForRadius(radius: number) {
  const kepler =
    Math.pow(baseDuration, 2) / Math.pow(baseSemiMajorAxeLength, 3);

  return Math.sqrt(Math.pow(radius * 3, 3) * kepler);
}

interface PlanetProps {
  radius: number;
  size: number;
  theta: number;
  duration: number;
  color: ColorValue;
}

function Planet({ radius, size, color, duration, theta }: PlanetProps) {
  const [offset] = useState(Math.random() * 2 * Math.PI);

  const t = useLoop(2 * Math.PI, duration);

  const rx = 3 * radius;
  const ry = radius;

  const animatedProps = useAnimatedProps(() => {
    // calculate position according to parametric equation of ellipse
    const x = rx * Math.cos(t.value + offset);
    const y = ry * Math.sin(t.value + offset);

    // rotate by theta
    const thetaRad = theta * (Math.PI / 180);
    const cx = `${x * Math.cos(thetaRad) - y * Math.sin(thetaRad)}`;
    const cy = `${x * Math.sin(thetaRad) + y * Math.cos(thetaRad)}`;

    return { cx, cy };
  });

  return (
    <>
      <Ellipse
        cx={0}
        cy={0}
        rx={rx}
        ry={ry}
        transform={`rotate(${theta} 0 0)`}
        fill="none"
        stroke="gray"
        strokeWidth={1}
      />
      <AnimatedCircle r={size} fill={color} animatedProps={animatedProps} />
    </>
  );
}

const SUN_RADIUS = 50;
const SUN_DIAMETER = SUN_RADIUS * 2;
const SUN_COLOR = 'gold';

function TopSun() {
  const d = `M${SUN_RADIUS},0 a${SUN_RADIUS},${SUN_RADIUS} 0 1,0 -${SUN_DIAMETER},0`;
  return <Path d={d} fill={SUN_COLOR} />;
}

function BottomSun() {
  const d = `M-${SUN_RADIUS},0 a${SUN_RADIUS},${SUN_RADIUS} 0 0,0 ${SUN_DIAMETER},0`;
  return <Path d={d} fill={SUN_COLOR} />;
}

export default function PlanetsExample() {
  return (
    <View style={styles.container}>
      <Svg viewBox="-200 -200 400 400" style={styles.svg}>
        <BottomSun />
        <Planet
          radius={25}
          size={5}
          theta={-15}
          duration={getDurationForRadius(25)}
          color="tomato"
        />
        <Planet
          radius={35}
          size={10}
          theta={-15}
          duration={getDurationForRadius(35)}
          color="limegreen"
        />
        <Planet
          radius={45}
          size={7}
          theta={-15}
          duration={getDurationForRadius(45)}
          color="dodgerblue"
        />
        <Planet
          radius={55}
          size={8}
          theta={-15}
          duration={getDurationForRadius(55)}
          color="fuchsia"
        />
        <TopSun />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  svg: {
    aspectRatio: 1,
    width: '100%',
  },
});
