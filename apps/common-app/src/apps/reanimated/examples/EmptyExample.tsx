import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

type Point = [number, number, number];
type Section = [number, number, number, number, number];
type Mesh = { vertices: Point[]; faces: [number, number, number][] };

const AnimatedPath = Animated.createAnimatedComponent(Path);
const HORSE = createHorse();
const PARTICLES = sampleSurface(HORSE, 1200);
const TURN_DURATION = 9000;
const VERTEX_COUNT = HORSE.vertices.length;
const POINT_COUNT = PARTICLES.length;

export default function EmptyExample() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const angle = useSharedValue(0.55);
  const frames = useSharedValue<number[]>([]);
  const [frameReport, setFrameReport] = useState('Warming up');
  const reportFrames = useCallback((samples: number[]) => {
    const total = samples.reduce((sum, value) => sum + value, 0);
    const maximum = Math.max(...samples);
    const slow = samples.filter((value) => value > 20).length;
    const sorted = [...samples].sort((a, b) => a - b);
    setFrameReport(
      `${((samples.length * 1000) / total).toFixed(1)} FPS; ${slow} frames over 20 ms; max ${maximum.toFixed(2)} ms; p99 ${sorted[Math.ceil(samples.length * 0.99) - 1].toFixed(2)} ms; ${total.toFixed(0)} ms; ${VERTEX_COUNT} vertices; ${POINT_COUNT} points`
    );
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      statusBarHidden: true,
      autoHideHomeIndicator: true,
    });
  }, [navigation]);

  useFrameCallback(
    useCallback(
      (frame) => {
        'worklet';
        angle.value =
          0.55 + (frame.timeSinceFirstFrame / TURN_DURATION) * Math.PI * 2;
        if (frame.timeSinceFirstFrame < 3000) {
          return;
        }
        const delta = frame.timeSincePreviousFrame;
        if (delta !== null) {
          frames.value.push(delta);
        }
        if (frames.value.length === 600) {
          scheduleOnRN(reportFrames, frames.value);
          frames.value = [];
        }
      },
      [angle, frames, reportFrames]
    )
  );

  const particles = useAnimatedProps(() => ({
    d: projectPoints(PARTICLES, angle.value),
  }));

  return (
    <View
      accessible
      accessibilityLabel="Rotating horse"
      accessibilityValue={{ text: frameReport }}
      style={styles.container}>
      <Svg
        pointerEvents="none"
        width={Math.min(width - 24, 540)}
        height={Math.min(width - 24, 540)}
        viewBox="-220 -220 440 440">
        <AnimatedPath
          animatedProps={particles}
          fill="none"
          stroke="#e6edf6"
          strokeOpacity={1}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function createHorse(): Mesh {
  const mesh: Mesh = { vertices: [], faces: [] };
  addTube(
    mesh,
    [
      [-0.96, 0.15, 0, 0.13, 0.16],
      [-0.81, 0.18, 0, 0.3, 0.26],
      [-0.55, 0.18, 0, 0.35, 0.3],
      [-0.25, 0.17, 0, 0.32, 0.28],
      [0.05, 0.18, 0, 0.31, 0.26],
      [0.31, 0.22, 0, 0.36, 0.27],
      [0.5, 0.29, 0, 0.32, 0.23],
      [0.59, 0.37, 0, 0.18, 0.16],
    ],
    14
  );
  addTube(
    mesh,
    [
      [0.34, 0.26, 0, 0.27, 0.24],
      [0.48, 0.51, 0, 0.26, 0.22],
      [0.59, 0.77, 0, 0.23, 0.18],
      [0.68, 1.01, 0, 0.18, 0.14],
      [0.84, 1.14, 0, 0.13, 0.12],
    ],
    12
  );
  addTube(
    mesh,
    [
      [0.74, 1.12, 0, 0.15, 0.13],
      [0.9, 1.16, 0, 0.19, 0.15],
      [1.07, 1.06, 0, 0.15, 0.13],
      [1.23, 0.95, 0, 0.12, 0.11],
      [1.38, 0.89, 0, 0.1, 0.12],
      [1.43, 0.89, 0, 0.06, 0.09],
    ],
    10
  );
  for (const side of [-1, 1]) {
    addTube(
      mesh,
      [
        [0.78, 1.25, side * 0.085, 0.075, 0.045],
        [0.78, 1.39, side * 0.1, 0.045, 0.027],
        [0.84, 1.53, side * 0.11, 0.005, 0.005],
      ],
      6
    );
  }
  addTube(
    mesh,
    [
      [0.38, 0.29, -0.2, 0.16, 0.115],
      [0.68, 0.03, -0.22, 0.11, 0.08],
      [1.02, -0.17, -0.23, 0.065, 0.055],
      [1.23, -0.4, -0.23, 0.043, 0.04],
      [1.36, -0.62, -0.23, 0.045, 0.045],
      [1.43, -0.69, -0.23, 0.065, 0.06],
    ],
    7
  );
  addTube(
    mesh,
    [
      [0.38, 0.24, 0.2, 0.15, 0.11],
      [0.67, -0.05, 0.23, 0.095, 0.075],
      [0.91, -0.16, 0.24, 0.065, 0.055],
      [0.81, -0.4, 0.24, 0.05, 0.04],
      [0.62, -0.53, 0.24, 0.035, 0.035],
      [0.55, -0.57, 0.24, 0.065, 0.055],
    ],
    7
  );
  addTube(
    mesh,
    [
      [-0.7, 0.12, -0.2, 0.2, 0.13],
      [-0.64, -0.14, -0.22, 0.14, 0.09],
      [-0.35, -0.38, -0.23, 0.08, 0.065],
      [-0.14, -0.52, -0.23, 0.045, 0.04],
      [0.21, -0.67, -0.23, 0.035, 0.035],
      [0.37, -0.74, -0.23, 0.06, 0.055],
    ],
    7
  );
  addTube(
    mesh,
    [
      [-0.72, 0.11, 0.2, 0.2, 0.13],
      [-0.84, -0.21, 0.23, 0.13, 0.09],
      [-1.05, -0.48, 0.24, 0.075, 0.06],
      [-1.14, -0.62, 0.24, 0.05, 0.04],
      [-1.01, -0.96, 0.24, 0.035, 0.035],
      [-0.88, -1.12, 0.24, 0.065, 0.055],
    ],
    7
  );
  addTube(
    mesh,
    [
      [-0.84, 0.32, 0, 0.095, 0.09],
      [-1.09, 0.37, 0, 0.1, 0.085],
      [-1.32, 0.3, 0, 0.12, 0.075],
      [-1.52, 0.13, 0, 0.13, 0.06],
      [-1.7, -0.04, 0, 0.1, 0.04],
      [-1.88, -0.16, 0, 0.01, 0.01],
    ],
    7
  );
  addTube(
    mesh,
    [
      [0.36, 0.49, 0, 0.085, 0.035],
      [0.35, 0.69, 0, 0.09, 0.04],
      [0.42, 0.9, 0, 0.09, 0.04],
      [0.5, 1.08, 0, 0.08, 0.035],
      [0.67, 1.23, 0, 0.055, 0.025],
      [0.78, 1.29, 0, 0.01, 0.01],
    ],
    6
  );
  return mesh;
}

function addTube(mesh: Mesh, sections: Section[], sides: number) {
  const offset = mesh.vertices.length;
  sections.forEach(([x, y, z, radius, depth], index) => {
    const previous = sections[Math.max(0, index - 1)];
    const next = sections[Math.min(sections.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy);
    for (let side = 0; side < sides; side++) {
      const theta = (side / sides) * Math.PI * 2;
      const r = Math.cos(theta) * radius;
      mesh.vertices.push([
        x - (dy / length) * r,
        y + (dx / length) * r,
        z + Math.sin(theta) * depth,
      ]);
      if (index > 0) {
        const a = offset + (index - 1) * sides + side;
        const b = offset + (index - 1) * sides + ((side + 1) % sides);
        const c = offset + index * sides + side;
        const d = offset + index * sides + ((side + 1) % sides);
        mesh.faces.push([a, b, c], [b, d, c]);
      }
    }
  });
}

function sampleSurface(mesh: Mesh, count: number): Point[] {
  let seed = 7391;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const areas = mesh.faces.map(([a, b, c]) => {
    const p = mesh.vertices[a];
    const q = mesh.vertices[b];
    const r = mesh.vertices[c];
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    return (
      Math.hypot(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      ) / 2
    );
  });
  const total = areas.reduce((sum, area) => sum + area, 0);
  const points: Point[] = [];
  mesh.faces.forEach(([a, b, c], index) => {
    const samples = Math.round((areas[index] / total) * count);
    for (let i = 0; i < samples; i++) {
      const u = Math.sqrt(random());
      const v = random();
      points.push(
        [0, 1, 2].map(
          (axis) =>
            (1 - u) * mesh.vertices[a][axis] +
            u * (1 - v) * mesh.vertices[b][axis] +
            u * v * mesh.vertices[c][axis]
        ) as Point
      );
    }
  });
  return points;
}

function projectPoints(points: Point[], angle: number) {
  'worklet';
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  let path = '';
  for (const [x, y, z] of points) {
    const screenX = ((x + 0.2) * cosine + z * sine) * 105;
    const screenY = -(y - 0.2) * 105;
    path += `M${Math.round(screenX * 10) / 10},${Math.round(screenY * 10) / 10}h0.15`;
  }
  return path;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181818',
  },
});
