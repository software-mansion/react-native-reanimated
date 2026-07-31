'use strict';
import type {
  NativeAnimationNode,
  NativeEasingNode,
} from '../animation/nativeAnimationNode';
import type { AnimationObject, LayoutAnimation } from '../commonTypes';
import { sampleNativeLayoutAnimation } from './nativeAnimationSampler';
import type {
  NativeLayoutRect,
  NativeTransformMatrix,
} from './nativeTransformMatrix';

/**
 * Native layout-animation descriptor.
 *
 * Instead of driving layout animations frame-by-frame from JS (the legacy
 * "React mutation" path), the native backend plays a pre-computed, generic
 * keyframe descriptor using the platform's native animation engine (Core
 * Animation on iOS, `android.animation` on Android).
 *
 * Runtime compilation produces typed tracks with original millisecond key times
 * and complete transform matrices. This normalized scalar form remains only as
 * a readable compatibility/debug view for existing instrumentation.
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

interface NativeLayoutAnimationDescriptor {
  /** Total animation duration in milliseconds (includes any delay). */
  durationMs: number;
  properties: NativeLayoutAnimationProperty[];
}

type NativeLayoutAnimationRoute =
  | 'simple'
  | 'structured'
  | 'sampled'
  | 'legacy';

type NativeLayoutAnimationRouteReason =
  | 'canonical-single-timing'
  | 'contains-hold-or-sequence'
  | 'requires-sampling'
  | 'reduced-motion'
  | 'zero-duration'
  | 'sampling-resource-exhausted'
  | 'infinite-repeat'
  | 'unsupported-property'
  | 'unsupported-value-type'
  | 'transform-ordering-unavailable'
  | 'invalid-input';

interface NativeTimingSegmentDescriptor {
  kind: 'timing';
  startMs: number;
  endMs: number;
  from: number;
  to: number;
  easing: NativeEasingNode;
}

interface NativeHoldSegmentDescriptor {
  kind: 'hold';
  startMs: number;
  endMs: number;
  value: number;
}

interface NativeKeyframeSegmentDescriptor {
  kind: 'keyframes';
  timesMs: number[];
  values: Array<number | NativeTransformMatrix>;
}

type NativeAnimationSegmentDescriptor =
  | NativeTimingSegmentDescriptor
  | NativeHoldSegmentDescriptor
  | NativeKeyframeSegmentDescriptor;

export interface NativeAnimationTrackDescriptor {
  target: string;
  segments: NativeAnimationSegmentDescriptor[];
  initialTimeOffsetMs?: number;
}

export interface NativeAnimationPlanDescriptor {
  totalDurationMs: number;
  route: NativeLayoutAnimationRoute;
  reason: NativeLayoutAnimationRouteReason;
  tracks: NativeAnimationTrackDescriptor[];
  finalGeometry?: NativeLayoutRect;
}

export type NativeLayoutAnimationCompilation =
  | {
      status: 'native';
      reason: NativeLayoutAnimationRouteReason;
      plan: NativeAnimationPlanDescriptor;
    }
  | {
      status: 'complete';
      reason: 'reduced-motion' | 'zero-duration';
    }
  | {
      status: 'fallback' | 'invalid';
      reason: NativeLayoutAnimationRouteReason;
    };

const STRUCTURAL_SCALAR_TARGETS = new Set([
  'opacity',
  'originX',
  'originY',
  'width',
  'height',
]);

const MATRIX_PLAN_TARGETS = new Set([
  ...STRUCTURAL_SCALAR_TARGETS,
  'transform',
  'transformOrigin',
]);

/**
 * Readable compatibility view of the typed sampled plan. Runtime compilation
 * uses `sampleNativeLayoutAnimation` directly so matrices and nonuniform times
 * never pass through the historical scalar-channel adapter.
 */
export function buildNativeLayoutAnimationDescriptor(
  style: LayoutAnimation,
  fallbackOpacity?: number
): NativeLayoutAnimationDescriptor {
  'worklet';
  const sampled = sampleNativeLayoutAnimation(style, fallbackOpacity);
  if (sampled.status !== 'native') {
    return { durationMs: 0, properties: [] };
  }
  const properties: NativeLayoutAnimationProperty[] = [];
  for (const track of sampled.plan.tracks) {
    const segment = track.segments[0];
    if (
      segment?.kind !== 'keyframes' ||
      segment.values.some((value) => typeof value !== 'number')
    ) {
      continue;
    }
    properties.push({
      keyPath: track.target,
      offsets: segment.timesMs.map(
        (timeMs) => timeMs / sampled.plan.totalDurationMs
      ),
      values: segment.values as number[],
    });
  }
  return {
    durationMs: sampled.plan.totalDurationMs,
    properties,
  };
}

interface CompiledNode {
  durationMs: number;
  finalValue: number;
  initialTimeOffsetMs: number;
  segments: NativeAnimationSegmentDescriptor[];
}

function shiftSegments(
  segments: NativeAnimationSegmentDescriptor[],
  offsetMs: number
): NativeAnimationSegmentDescriptor[] {
  'worklet';
  return segments.map((segment) => {
    if (segment.kind === 'keyframes') {
      return {
        ...segment,
        timesMs: segment.timesMs.map((timeMs) => timeMs + offsetMs),
      };
    }
    return {
      ...segment,
      startMs: segment.startMs + offsetMs,
      endMs: segment.endMs + offsetMs,
    };
  });
}

function compileNode(
  node: NativeAnimationNode | undefined,
  from: number,
  allowInitialTimeOffset = true
): CompiledNode | null {
  'worklet';
  if (!node) {
    return null;
  }
  if (node.kind === 'timing') {
    if (
      node.hasCallback ||
      node.easing === null ||
      typeof node.toValue !== 'number' ||
      !Number.isFinite(node.durationMs) ||
      node.durationMs < 0 ||
      !Number.isFinite(from) ||
      !Number.isFinite(node.toValue)
    ) {
      return null;
    }
    return {
      durationMs: node.durationMs,
      finalValue: node.toValue,
      initialTimeOffsetMs: 0,
      segments: [
        {
          kind: 'timing',
          startMs: 0,
          endMs: node.durationMs,
          from,
          to: node.toValue,
          easing: node.easing,
        },
      ],
    };
  }
  if (node.kind === 'delay') {
    if (!Number.isFinite(node.delayMs)) {
      return null;
    }
    const child = compileNode(node.animation ?? undefined, from, false);
    if (!child) {
      return null;
    }
    if (node.delayMs < 0) {
      if (!allowInitialTimeOffset) {
        return null;
      }
      return {
        durationMs: child.durationMs,
        finalValue: child.finalValue,
        initialTimeOffsetMs: Math.min(-node.delayMs, child.durationMs),
        segments: child.segments,
      };
    }
    const hold: NativeHoldSegmentDescriptor[] =
      node.delayMs === 0
        ? []
        : [
            {
              kind: 'hold',
              startMs: 0,
              endMs: node.delayMs,
              value: from,
            },
          ];
    return {
      durationMs: node.delayMs + child.durationMs,
      finalValue: child.finalValue,
      initialTimeOffsetMs: 0,
      segments: [...hold, ...shiftSegments(child.segments, node.delayMs)],
    };
  }

  if (node.kind === 'repeat') {
    return null;
  }

  let elapsedMs = 0;
  let currentValue = from;
  const segments: NativeAnimationSegmentDescriptor[] = [];
  for (const childNode of node.animations) {
    const child = compileNode(childNode ?? undefined, currentValue, false);
    if (!child) {
      return null;
    }
    segments.push(...shiftSegments(child.segments, elapsedMs));
    elapsedMs += child.durationMs;
    currentValue = child.finalValue;
  }
  return {
    durationMs: elapsedMs,
    finalValue: currentValue,
    initialTimeOffsetMs: 0,
    segments,
  };
}

function animationGraphHasMotion(value: unknown): boolean {
  'worklet';
  if (Array.isArray(value)) {
    return value.some(animationGraphHasMotion);
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const animation = value as Record<string, unknown>;
  if (typeof animation.onFrame === 'function') {
    return animation.reduceMotion !== true;
  }
  return Object.values(animation).some(animationGraphHasMotion);
}

function animationGraphContainsAnimation(value: unknown): boolean {
  'worklet';
  if (Array.isArray(value)) {
    return value.some(animationGraphContainsAnimation);
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const animation = value as Record<string, unknown>;
  return (
    typeof animation.onFrame === 'function' ||
    Object.values(animation).some(animationGraphContainsAnimation)
  );
}

function nativeNodeDurationMs(
  node: NativeAnimationNode | undefined
): number | null {
  'worklet';
  if (!node) {
    return null;
  }
  if (node.kind === 'timing') {
    return Number.isFinite(node.durationMs)
      ? Math.max(0, node.durationMs)
      : null;
  }
  if (node.kind === 'delay') {
    const childDuration = nativeNodeDurationMs(node.animation ?? undefined);
    return childDuration === null || !Number.isFinite(node.delayMs)
      ? null
      : Math.max(0, node.delayMs) + childDuration;
  }
  if (node.kind === 'repeat') {
    const childDuration = nativeNodeDurationMs(node.animation ?? undefined);
    return childDuration === null || node.count <= 0
      ? null
      : childDuration * node.count;
  }
  let durationMs = 0;
  for (const child of node.animations) {
    const childDuration = nativeNodeDurationMs(child ?? undefined);
    if (childDuration === null) {
      return null;
    }
    durationMs += childDuration;
  }
  return durationMs;
}

function animationGraphDurationMs(value: unknown): number | null {
  'worklet';
  if (Array.isArray(value)) {
    let durationMs = 0;
    let foundAnimation = false;
    for (const child of value) {
      const childDuration = animationGraphDurationMs(child);
      if (childDuration !== null) {
        durationMs = Math.max(durationMs, childDuration);
        foundAnimation = true;
      } else if (animationGraphContainsAnimation(child)) {
        return null;
      }
    }
    return foundAnimation ? durationMs : null;
  }
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const animation = value as Record<string, unknown>;
  if (typeof animation.onFrame === 'function') {
    return nativeNodeDurationMs(
      (animation as unknown as { __nativeAnimation?: NativeAnimationNode })
        .__nativeAnimation
    );
  }
  return animationGraphDurationMs(Object.values(animation));
}

function trackDurationMs(track: NativeAnimationTrackDescriptor): number {
  'worklet';
  const last = track.segments[track.segments.length - 1];
  if (!last) {
    return 0;
  }
  return last.kind === 'keyframes'
    ? (last.timesMs[last.timesMs.length - 1] ?? 0)
    : last.endMs;
}

function buildStructuralPlan(
  style: LayoutAnimation,
  fallbackOpacity?: number
): NativeAnimationPlanDescriptor | null {
  'worklet';
  const animations = style.animations as Record<string, unknown>;
  const initialValues = style.initialValues as Record<string, unknown>;
  const tracks: NativeAnimationTrackDescriptor[] = [];

  for (const target of Object.keys(animations)) {
    if (!STRUCTURAL_SCALAR_TARGETS.has(target)) {
      return null;
    }
    const animation = animations[target] as AnimationObject;
    const from = initialValues[target];
    if (
      typeof from !== 'number' ||
      animation.reduceMotion === true ||
      !animation.__nativeAnimation
    ) {
      return null;
    }
    const compiled = compileNode(animation.__nativeAnimation, from);
    if (!compiled) {
      return null;
    }
    tracks.push({
      target,
      segments: compiled.segments,
      ...(compiled.initialTimeOffsetMs > 0
        ? { initialTimeOffsetMs: compiled.initialTimeOffsetMs }
        : {}),
    });
  }

  if (
    fallbackOpacity !== undefined &&
    !Object.prototype.hasOwnProperty.call(animations, 'opacity')
  ) {
    tracks.push({
      target: 'opacity',
      segments: [
        {
          kind: 'hold',
          startMs: 0,
          endMs: Math.max(0, ...tracks.map(trackDurationMs)),
          value: fallbackOpacity,
        },
      ],
    });
  }

  if (tracks.length === 0) {
    return null;
  }
  const totalDurationMs = Math.max(0, ...tracks.map(trackDurationMs));
  const simple = tracks.every(
    (track) =>
      track.segments.length === 1 && track.segments[0].kind === 'timing'
  );
  return {
    totalDurationMs,
    route: simple ? 'simple' : 'structured',
    reason: simple ? 'canonical-single-timing' : 'contains-hold-or-sequence',
    tracks,
  };
}

export function compileNativeLayoutAnimation(
  style: LayoutAnimation,
  fallbackOpacity?: number,
  expectedFinalGeometry?: NativeLayoutRect
): NativeLayoutAnimationCompilation {
  'worklet';
  const animationKeys = Object.keys(style.animations);
  if (
    animationGraphContainsAnimation(style.animations) &&
    !animationGraphHasMotion(style.animations)
  ) {
    return { status: 'complete', reason: 'reduced-motion' };
  }
  if (animationGraphDurationMs(style.animations) === 0) {
    return { status: 'complete', reason: 'zero-duration' };
  }
  if (animationKeys.some((target) => !MATRIX_PLAN_TARGETS.has(target))) {
    return { status: 'fallback', reason: 'unsupported-property' };
  }
  const requiresMatrixPlan =
    animationKeys.includes('transform') ||
    animationKeys.includes('transformOrigin') ||
    animationKeys.includes('width') ||
    animationKeys.includes('height');
  if (requiresMatrixPlan) {
    const sampled = sampleNativeLayoutAnimation(
      style,
      fallbackOpacity,
      expectedFinalGeometry
    );
    return sampled.status === 'native'
      ? {
          status: 'native',
          reason: sampled.plan.reason,
          plan: sampled.plan,
        }
      : {
          status: 'fallback',
          reason:
            sampled.reason === 'unsupported-value-type' &&
            animationKeys.includes('transform')
              ? 'transform-ordering-unavailable'
              : sampled.reason,
        };
  }

  const structuralPlan = buildStructuralPlan(style, fallbackOpacity);
  if (structuralPlan) {
    if (structuralPlan.totalDurationMs === 0) {
      return { status: 'complete', reason: 'zero-duration' };
    }
    structuralPlan.finalGeometry = expectedFinalGeometry;
    return {
      status: 'native',
      reason: structuralPlan.reason,
      plan: structuralPlan,
    };
  }

  const sampled = sampleNativeLayoutAnimation(
    style,
    fallbackOpacity,
    expectedFinalGeometry
  );
  return sampled.status === 'native'
    ? {
        status: 'native',
        reason: sampled.plan.reason,
        plan: sampled.plan,
      }
    : { status: 'fallback', reason: sampled.reason };
}
