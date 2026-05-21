import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

const BASE_ORBIT = 80;
const ORBIT_GAP = 91;

type OrbitConfig = {
  size: number;
  duration: `${number}ms`;
  direction: 'normal' | 'reverse';
  planetSize: number;
  planetColor: string;
  planetGlow: string;
  ringColor: string;
  scaleY?: number;
  rotation?: number;
};

const ORBITS: OrbitConfig[] = [
  {
    size: BASE_ORBIT + ORBIT_GAP * 0,
    duration: '4500ms',
    direction: 'normal',
    planetSize: 10,
    planetColor: '#fde68a',
    planetGlow: 'rgba(253,230,138,0.65)',
    ringColor: 'rgba(253,230,138,0.22)',
    scaleY: 0.92,
  },
  {
    size: BASE_ORBIT + ORBIT_GAP * 1,
    duration: '7800ms',
    direction: 'reverse',
    planetSize: 14,
    planetColor: '#67e8f9',
    planetGlow: 'rgba(103,232,249,0.65)',
    ringColor: 'rgba(103,232,249,0.2)',
    scaleY: 0.62,
    rotation: -22,
  },
  {
    size: BASE_ORBIT + ORBIT_GAP * 2,
    duration: '12000ms',
    direction: 'normal',
    planetSize: 18,
    planetColor: '#c4b5fd',
    planetGlow: 'rgba(196,181,253,0.55)',
    ringColor: 'rgba(196,181,253,0.18)',
    scaleY: 0.84,
  },
  {
    size: BASE_ORBIT + ORBIT_GAP * 3,
    duration: '18500ms',
    direction: 'reverse',
    planetSize: 12,
    planetColor: '#fda4af',
    planetGlow: 'rgba(253,164,175,0.55)',
    ringColor: 'rgba(253,164,175,0.22)',
    scaleY: 0.48,
    rotation: 38,
  },
];

const COMET = {
  Rx: 180,
  Ry: 100,
  duration: '16000ms' as const,
  headSize: 6,
  headColor: '#ffffff',
  trailColor: 'rgba(178,238,255,0.95)',
  tailLength: 42,
  tailWidth: 5,
};

const STARS = Array.from({ length: 60 }, (_, i) => {
  const seed = i * 31 + 13;
  const left = ((seed * 17) % 1000) / 10;
  const top = ((seed * 23) % 1000) / 10;
  const size = 1 + ((seed * 7) % 30) / 10;
  const delay = (seed * 11) % 4000;
  const duration = 2200 + ((seed * 13) % 2800);
  const baseOpacity = 0.2 + ((seed * 19) % 50) / 100;
  return { left, top, size, delay, duration, baseOpacity };
});

export default function App() {
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.cosmicGlow} />
      <Starfield />
      <View style={styles.system}>
        {ORBITS.map((orbit) => (
          <Orbit key={orbit.size} config={orbit} />
        ))}
        <Comet />
        <View style={styles.sun} />
        <Animated.View
          style={[
            styles.sunHalo,
            {
              animationName: {
                '0%': { transform: [{ scale: 1 }], opacity: 0.4 },
                '50%': { transform: [{ scale: 1.35 }], opacity: 0.05 },
                '100%': { transform: [{ scale: 1 }], opacity: 0.4 },
              },
              animationDuration: '3200ms',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
            },
          ]}
        />
      </View>
    </View>
  );
}

function Starfield() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {STARS.map((star, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: '#ffffff',
            opacity: star.baseOpacity,
            animationName: {
              '0%': { opacity: star.baseOpacity * 0.4 },
              '50%': { opacity: 1 },
              '100%': { opacity: star.baseOpacity * 0.4 },
            },
            animationDuration: `${star.duration}ms`,
            animationDelay: `${star.delay}ms`,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          }}
        />
      ))}
    </View>
  );
}

function Orbit({ config }: { config: OrbitConfig }) {
  const scaleY = config.scaleY ?? 1;
  const rotation = config.rotation ?? 0;
  const Rx = config.size / 2;
  const Ry = Rx * scaleY;
  const keyframes = useMemo(
    () => buildEllipseKeyframes(Rx, Ry, rotation),
    [Rx, Ry, rotation]
  );
  const shimmerDuration = `${4200 + (config.size * 17) % 3800}ms` as const;
  const shimmerDelay = `${(config.size * 23) % 5000}ms` as const;
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbit,
          {
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2,
            borderColor: config.ringColor,
            marginLeft: -config.size / 2,
            marginTop: -config.size / 2,
            transform: [{ rotate: `${rotation}deg` }, { scaleY }],
            animationName: {
              '0%': { opacity: 0.75 },
              '50%': { opacity: 1 },
              '100%': { opacity: 0.75 },
            },
            animationDuration: shimmerDuration,
            animationDelay: shimmerDelay,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          },
        ]}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          marginLeft: -config.planetSize / 2,
          marginTop: -config.planetSize / 2,
          width: config.planetSize,
          height: config.planetSize,
          borderRadius: config.planetSize / 2,
          overflow: 'hidden',
          backgroundColor: config.planetColor,
          animationName: keyframes,
          animationDuration: config.duration,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
          animationDirection: config.direction,
        }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            experimental_backgroundImage:
              'linear-gradient(180deg, rgba(0,0,0,0) 10%, rgba(0,0,0,1) 100%)',
          }}
        />
      </Animated.View>
    </>
  );
}

function buildEllipseKeyframes(Rx: number, Ry: number, rotationDeg = 0) {
  const steps = 24;
  const θ = (rotationDeg * Math.PI) / 180;
  const cosθ = Math.cos(θ);
  const sinθ = Math.sin(θ);
  const keyframes: Record<
    string,
    {
      transform: (
        | { translateX: number }
        | { translateY: number }
        | { rotate: `${number}deg` }
      )[];
    }
  > = {};
  let prevPhase: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const x0 = Rx * Math.sin(angle);
    const y0 = -Ry * Math.cos(angle);
    const x = x0 * cosθ - y0 * sinθ;
    const y = x0 * sinθ + y0 * cosθ;
    let phase = Math.atan2(-x, y);
    if (prevPhase !== null) {
      while (phase - prevPhase > Math.PI) phase -= 2 * Math.PI;
      while (phase - prevPhase < -Math.PI) phase += 2 * Math.PI;
    }
    prevPhase = phase;
    const phaseDeg = Number(((phase * 180) / Math.PI).toFixed(3));
    const percent = (i / steps) * 100;
    const key = i === 0 ? '0%' : i === steps ? '100%' : `${percent.toFixed(4)}%`;
    keyframes[key] = {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${phaseDeg}deg` },
      ],
    };
  }
  return keyframes;
}

const COMET_C = Math.sqrt(COMET.Rx * COMET.Rx - COMET.Ry * COMET.Ry);

function buildCometKeyframes(
  options: {
    motion?: boolean;
    fadeTail?: boolean;
    fadeShadow?: boolean;
    fadeBody?: boolean;
    fadeHemisphere?: boolean;
  } = {}
) {
  const steps = 96;
  const e = COMET_C / COMET.Rx;
  const minDist = COMET.Rx - COMET_C;
  type Frame = {
    opacity?: number;
    shadowOpacity?: number;
    shadowRadius?: number;
    transform?: (
      | { translateX: number }
      | { translateY: number }
      | { rotate: `${number}deg` }
    )[];
  };
  const k: Record<string, Frame> = {};
  let prevAngle: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const E = Math.PI + (2 * Math.PI * i) / steps;
    const M = E - e * Math.sin(E);
    const t = (M - Math.PI) / (2 * Math.PI);
    const x = COMET.Rx * Math.cos(E) - COMET_C;
    const y = COMET.Ry * Math.sin(E);
    let angleRad = Math.atan2(y, x);
    if (prevAngle !== null) {
      while (angleRad - prevAngle > Math.PI) angleRad -= 2 * Math.PI;
      while (angleRad - prevAngle < -Math.PI) angleRad += 2 * Math.PI;
    }
    prevAngle = angleRad;
    const angleDeg = Number(((angleRad * 180) / Math.PI).toFixed(3));
    const percent = (t * 100).toFixed(4);
    const key = i === 0 ? '0%' : i === steps ? '100%' : `${percent}%`;
    const frame: Frame = {};
    if (options.motion) {
      frame.transform = [
        { translateX: Number(x.toFixed(3)) },
        { translateY: Number(y.toFixed(3)) },
        { rotate: `${angleDeg}deg` },
      ];
    }
    const dist = Math.sqrt(x * x + y * y);
    if (options.fadeTail) {
      const tailCutoff = minDist * 2.2;
      if (dist >= tailCutoff) {
        frame.opacity = 0;
      } else {
        const ratio = minDist / dist;
        const cutoffFactor = (tailCutoff - dist) / (tailCutoff - minDist);
        frame.opacity = Number((ratio * ratio * cutoffFactor).toFixed(3));
      }
    } else if (options.fadeBody) {
      const ratio = minDist / dist;
      frame.opacity = Number(
        Math.max(0.05, Math.pow(ratio, 0.6)).toFixed(3)
      );
    }
    if (options.fadeHemisphere) {
      const ratio = minDist / dist;
      frame.opacity = Number(Math.max(0, 1 - ratio).toFixed(3));
    }
    if (options.fadeShadow) {
      const tailCutoff = minDist * 2.2;
      if (dist >= tailCutoff) {
        frame.shadowOpacity = 0;
        frame.shadowRadius = 0;
      } else {
        const proximity = (tailCutoff - dist) / (tailCutoff - minDist);
        const q = proximity * proximity;
        frame.shadowOpacity = Number((0.7 * q).toFixed(3));
        frame.shadowRadius = Number((1 + 7 * q).toFixed(3));
      }
    }
    k[key] = frame;
  }
  return k;
}

function Comet() {
  const motionKeyframes = useMemo(
    () => buildCometKeyframes({ motion: true }),
    []
  );
  const tailFadeKeyframes = useMemo(
    () => buildCometKeyframes({ fadeTail: true }),
    []
  );
  const headShadowKeyframes = useMemo(
    () => buildCometKeyframes({ fadeShadow: true, fadeBody: true }),
    []
  );
  const hemisphereKeyframes = useMemo(
    () => buildCometKeyframes({ fadeHemisphere: true }),
    []
  );
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: COMET.Rx * 2,
          height: COMET.Rx * 2,
          borderRadius: COMET.Rx,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.06)',
          marginLeft: -COMET.Rx - COMET_C,
          marginTop: -COMET.Rx,
          transform: [{ scaleY: COMET.Ry / COMET.Rx }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          animationName: motionKeyframes,
          animationDuration: COMET.duration,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -COMET.tailWidth / 2,
            left: 0,
            width: COMET.tailLength,
            height: COMET.tailWidth,
            borderRadius: COMET.tailWidth / 2,
            experimental_backgroundImage: `linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(178,238,255,1) 12%, rgba(178,238,255,0) 100%)`,
            animationName: tailFadeKeyframes,
            animationDuration: COMET.duration,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          }}
        />
        <Animated.View
          style={{
            position: 'absolute',
            top: -COMET.headSize / 2,
            left: -COMET.headSize / 2,
            width: COMET.headSize,
            height: COMET.headSize,
            borderRadius: COMET.headSize / 2,
            overflow: 'hidden',
            backgroundColor: COMET.headColor,
            shadowColor: COMET.trailColor,
            shadowOffset: { width: 0, height: 0 },
            animationName: headShadowKeyframes,
            animationDuration: COMET.duration,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          }}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              experimental_backgroundImage:
                'linear-gradient(90deg, rgba(0,0,0,0) 10%, rgba(0,0,0,1) 100%)',
              animationName: hemisphereKeyframes,
              animationDuration: COMET.duration,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            }}
          />
        </Animated.View>
      </Animated.View>
    </>
  );
}

const SUN_SIZE = 48;
const HALO_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05050f',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cosmicGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage:
      'radial-gradient(circle at 50% 50%, rgba(76,29,149,0.35), rgba(5,5,15,0) 70%)',
  },
  system: {
    width: 1,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 0.4,
  },
  planet: {
    position: 'absolute',
  },
  sun: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SUN_SIZE,
    height: SUN_SIZE,
    marginLeft: -SUN_SIZE / 2,
    marginTop: -SUN_SIZE / 2,
    borderRadius: SUN_SIZE / 2,
    experimental_backgroundImage:
      'radial-gradient(circle at 35% 35%, rgb(255,243,191), rgb(252,176,64) 70%, rgb(220,90,30) 100%)',
    shadowColor: 'rgba(252,176,64,0.9)',
    shadowOpacity: 1,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  sunHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: HALO_SIZE,
    height: HALO_SIZE,
    marginLeft: -HALO_SIZE / 2,
    marginTop: -HALO_SIZE / 2,
    borderRadius: HALO_SIZE / 2,
    experimental_backgroundImage:
      'radial-gradient(circle, rgba(252,176,64,0.4), rgba(252,176,64,0) 70%)',
  },
});
