'use strict';
import { withStyleAnimation } from '../animation';
import type { AnimationObject, LayoutAnimation } from '../commonTypes';

/**
 * Native layout-animation descriptor.
 *
 * Instead of driving layout animations frame-by-frame from JS (the legacy
 * "React mutation" path), the native backend plays a pre-computed, generic
 * keyframe descriptor using the platform's native animation engine (Core
 * Animation on iOS, `android.animation` on Android).
 *
 * The descriptor is produced by SAMPLING the regular Reanimated animation
 * objects (the same `withTiming`/`withSequence`/`withSpring`/easing the legacy
 * path uses) across virtual time. Because we tick the actual animation objects,
 * every preset - including multi-keyframe sequences (Bounce, LightSpeed),
 * per-property easing (Curved) and springs - is supported automatically, with
 * easing and spring physics baked into the sampled curve.
 *
 * Each property carries parallel `offsets` (normalized 0..1) and `values`
 * arrays so it maps trivially onto `CAKeyframeAnimation` (iOS) and `Keyframe[]`
 * / `ValueAnimator` (Android) on the native side.
 */
interface NativeLayoutAnimationProperty {
  /**
   * Canonical, platform-agnostic channel name. One of: `opacity`, `originX`,
   * `originY`, `width`, `height`, `translateX`, `translateY`, `scaleX`,
   * `scaleY`, `rotation`, `rotationX`, `rotationY`, `skewX`, `perspective`.
   * Angles (`rotation*`, `skewX`) are expressed in radians.
   */
  keyPath: string;
  /** Normalized keyframe offsets in [0, 1]; same length as `values`. */
  offsets: number[];
  /** Keyframe numeric values; same length as `offsets`. */
  values: number[];
}

export interface NativeLayoutAnimationDescriptor {
  /** Total animation duration in milliseconds (includes any delay). */
  durationMs: number;
  properties: NativeLayoutAnimationProperty[];
}

/**
 * Sampling resolution. 60 keyframes-per-second matches the display refresh and
 * leaves the native engine to interpolate linearly between dense samples - the
 * baked easing/spring curve is already encoded in the sample values.
 */
const SAMPLE_INTERVAL_MS = 1000 / 60;
/** Safety bound so a never-terminating animation can't spin forever. */
const MAX_DURATION_MS = 20000;
/** Values closer than this are treated as equal when collapsing constants. */
const EPSILON = 1e-4;

const DEG_TO_RAD = Math.PI / 180;

function angleToRadians(value: number | string): number {
  'worklet';
  if (typeof value === 'number') {
    return value;
  }
  const trimmed = value.trim();
  const numeric = parseFloat(trimmed);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return trimmed.endsWith('deg') ? numeric * DEG_TO_RAD : numeric;
}

type FlatFrame = Record<string, number>;

/**
 * Flattens a resolved style snapshot (`withStyleAnimation`'s `current`) into a
 * flat map of canonical channel to numeric value for a single point in time.
 */
function flattenStyleSnapshot(style: Record<string, unknown>): FlatFrame {
  'worklet';
  const flat: FlatFrame = {};

  if (typeof style.opacity === 'number') {
    flat.opacity = style.opacity;
  }
  for (const key of ['originX', 'originY', 'width', 'height'] as const) {
    const value = style[key];
    if (typeof value === 'number') {
      flat[key] = value;
    }
  }

  const transform = style.transform;
  if (Array.isArray(transform)) {
    for (const entry of transform) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const transformEntry = entry as Record<string, number | string>;
      for (const key of Object.keys(transformEntry)) {
        const raw = transformEntry[key];
        switch (key) {
          case 'translateX':
          case 'translateY':
          case 'perspective':
            if (typeof raw === 'number') {
              flat[key] = raw;
            }
            break;
          case 'scale':
            if (typeof raw === 'number') {
              flat.scaleX = raw;
              flat.scaleY = raw;
            }
            break;
          case 'scaleX':
          case 'scaleY':
            if (typeof raw === 'number') {
              flat[key] = raw;
            }
            break;
          case 'rotate':
          case 'rotateZ':
            flat.rotation = angleToRadians(raw);
            break;
          case 'rotateX':
            flat.rotationX = angleToRadians(raw);
            break;
          case 'rotateY':
            flat.rotationY = angleToRadians(raw);
            break;
          case 'skewX':
            flat.skewX = angleToRadians(raw);
            break;
          case 'skewY':
            flat.skewY = angleToRadians(raw);
            break;
          default:
            break;
        }
      }
    }
  }

  return flat;
}

/**
 * Samples a layout-animation style (`{ animations, initialValues }`) into a
 * generic native keyframe descriptor. Runs on the UI runtime, where animation
 * factories resolve into concrete animation objects synchronously.
 */
export function buildNativeLayoutAnimationDescriptor(
  style: LayoutAnimation
): NativeLayoutAnimationDescriptor {
  'worklet';
  const animation = withStyleAnimation(
    style.animations
  ) as unknown as AnimationObject;

  const initialValues = style.initialValues as Record<string, unknown>;
  animation.onStart(animation, initialValues, 0, undefined);

  const sampleTimes: number[] = [];
  const sampleFrames: FlatFrame[] = [];

  let now = 0;
  let finished = false;
  // Always capture the initial frame, then advance until the animation reports
  // completion (or we hit the safety bound).
  while (true) {
    finished = animation.onFrame(animation, now);
    sampleTimes.push(now);
    sampleFrames.push(
      flattenStyleSnapshot(animation.current as Record<string, unknown>)
    );
    if (finished || now >= MAX_DURATION_MS) {
      break;
    }
    now += SAMPLE_INTERVAL_MS;
  }

  const durationMs = sampleTimes[sampleTimes.length - 1] || 1;

  // Collect every channel that ever appears across the sampled frames.
  const channels = new Set<string>();
  for (const frame of sampleFrames) {
    for (const key of Object.keys(frame)) {
      channels.add(key);
    }
  }

  const properties: NativeLayoutAnimationProperty[] = [];
  for (const channel of channels) {
    const offsets: number[] = [];
    const values: number[] = [];
    let lastValue = 0;
    let hasValue = false;
    let isConstant = true;

    for (let i = 0; i < sampleFrames.length; i++) {
      const frameValue = sampleFrames[i][channel];
      // A channel may be absent in a given frame (e.g. before its transform
      // entry resolves); carry the last seen value forward.
      const value = frameValue === undefined ? lastValue : frameValue;
      if (hasValue && Math.abs(value - lastValue) > EPSILON) {
        isConstant = false;
      }
      offsets.push(durationMs ? sampleTimes[i] / durationMs : 0);
      values.push(value);
      lastValue = value;
      hasValue = true;
    }

    // Collapse channels that never change into two keyframes - the native side
    // still needs the (constant) value applied for the animation's duration
    // (e.g. perspective during a flip), but doesn't need 60 identical frames.
    if (isConstant) {
      properties.push({
        keyPath: channel,
        offsets: [0, 1],
        values: [lastValue, lastValue],
      });
    } else {
      properties.push({ keyPath: channel, offsets, values });
    }
  }

  return { durationMs, properties };
}
