'use strict';

import { withStyleAnimation } from '../animation';
import type { NativeAnimationNode } from '../animation/nativeAnimationNode';
import type { AnimationObject, LayoutAnimation } from '../commonTypes';
import type {
  NativeAnimationPlanDescriptor,
  NativeAnimationTrackDescriptor,
} from './nativeAnimationDescriptor';
import {
  composeLayoutFlipMatrix,
  type NativeLayoutRect,
  type NativeTransformMatrix,
  resolveReactNativeTransformMatrix,
} from './nativeTransformMatrix';

const INTERNAL_STEP_MS = 4;
const MAX_DENSE_SAMPLES = 10000;
const SCALAR_TOLERANCE = {
  opacity: 0.001,
  originX: 0.25,
  originY: 0.25,
} as const;
const MATRIX_PROJECTED_CORNER_TOLERANCE_PX = 0.25;

type SampleValue = number | NativeTransformMatrix;

interface DenseSamples {
  durationMs: number;
  frames: Array<Record<string, unknown>>;
  timesMs: number[];
}

type NativeSamplingResult =
  | { status: 'native'; plan: NativeAnimationPlanDescriptor }
  | {
      status: 'fallback';
      reason:
        | 'infinite-repeat'
        | 'sampling-resource-exhausted'
        | 'unsupported-value-type'
        | 'invalid-input';
    };

function nodeDurationMs(node: NativeAnimationNode | undefined): number | null {
  'worklet';
  if (!node) {
    return null;
  }
  if (node.kind === 'timing') {
    return Number.isFinite(node.durationMs) && node.durationMs >= 0
      ? node.durationMs
      : null;
  }
  if (node.kind === 'delay') {
    const child = nodeDurationMs(node.animation ?? undefined);
    return child === null || !Number.isFinite(node.delayMs)
      ? null
      : Math.max(0, node.delayMs) + child;
  }
  if (node.kind === 'repeat') {
    const child = nodeDurationMs(node.animation ?? undefined);
    return child === null || node.count <= 0 ? null : child * node.count;
  }
  let durationMs = 0;
  for (const child of node.animations) {
    const childDuration = nodeDurationMs(child ?? undefined);
    if (childDuration === null) {
      return null;
    }
    durationMs += childDuration;
  }
  return durationMs;
}

function containsAnimation(value: unknown): boolean {
  'worklet';
  const pending = [value];
  while (pending.length > 0) {
    const candidate = pending.pop();
    if (Array.isArray(candidate)) {
      pending.push(...candidate);
    } else if (candidate !== null && typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      if (typeof record.onFrame === 'function') {
        return true;
      }
      pending.push(...Object.values(record));
    }
  }
  return false;
}

function animationDurationMs(value: unknown): number | null {
  'worklet';
  if (Array.isArray(value)) {
    let durationMs = 0;
    for (const child of value) {
      const childDuration = animationDurationMs(child);
      if (childDuration !== null) {
        durationMs = Math.max(durationMs, childDuration);
      } else if (containsAnimation(child)) {
        return null;
      }
    }
    return durationMs;
  }
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.onFrame === 'function') {
    return nodeDurationMs(
      (candidate as unknown as { __nativeAnimation?: NativeAnimationNode })
        .__nativeAnimation
    );
  }
  let durationMs = 0;
  let found = false;
  for (const child of Object.values(candidate)) {
    const childDuration = animationDurationMs(child);
    if (childDuration !== null) {
      durationMs = Math.max(durationMs, childDuration);
      found = true;
    } else if (containsAnimation(child)) {
      return null;
    }
  }
  return found ? durationMs : null;
}

function nodeBoundaries(
  node: NativeAnimationNode | undefined,
  offsetMs: number,
  boundaries: number[]
): void {
  'worklet';
  if (!node) {
    return;
  }
  if (node.kind === 'timing') {
    boundaries.push(offsetMs, offsetMs + node.durationMs);
    return;
  }
  if (node.kind === 'delay') {
    const delayMs = Math.max(0, node.delayMs);
    boundaries.push(offsetMs, offsetMs + delayMs);
    nodeBoundaries(node.animation ?? undefined, offsetMs + delayMs, boundaries);
    return;
  }
  if (node.kind === 'repeat') {
    const childDuration = nodeDurationMs(node.animation ?? undefined);
    if (childDuration === null || node.count <= 0) {
      return;
    }
    for (let index = 0; index < node.count; index++) {
      nodeBoundaries(
        node.animation ?? undefined,
        offsetMs + index * childDuration,
        boundaries
      );
    }
    return;
  }
  let elapsedMs = offsetMs;
  boundaries.push(elapsedMs);
  for (const child of node.animations) {
    nodeBoundaries(child ?? undefined, elapsedMs, boundaries);
    const childDuration = nodeDurationMs(child ?? undefined);
    if (childDuration === null) {
      return;
    }
    elapsedMs += childDuration;
    boundaries.push(elapsedMs);
  }
}

function semanticBoundaries(animations: unknown): number[] {
  'worklet';
  const boundaries: number[] = [];
  const pending = [animations];
  while (pending.length > 0) {
    const value = pending.pop();
    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }
    if (value === null || typeof value !== 'object') {
      continue;
    }
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.onFrame === 'function') {
      nodeBoundaries(
        (candidate as unknown as { __nativeAnimation?: NativeAnimationNode })
          .__nativeAnimation,
        0,
        boundaries
      );
      continue;
    }
    pending.push(...Object.values(candidate));
  }
  return boundaries;
}

function cloneSnapshot(style: Record<string, unknown>) {
  'worklet';
  const snapshot: Record<string, unknown> = {};
  for (const key of ['opacity', 'originX', 'originY', 'width', 'height']) {
    const value = style[key];
    if (typeof value === 'number') {
      snapshot[key] = value;
    }
  }
  if (Array.isArray(style.transform)) {
    snapshot.transform = style.transform.map((entry) =>
      entry !== null && typeof entry === 'object' ? { ...entry } : entry
    );
  }
  if (Array.isArray(style.transformOrigin)) {
    snapshot.transformOrigin = [...style.transformOrigin];
  } else if (typeof style.transformOrigin === 'string') {
    snapshot.transformOrigin = style.transformOrigin;
  }
  return snapshot;
}

function sampleDense(style: LayoutAnimation): DenseSamples | null {
  'worklet';
  const exactDurationMs = animationDurationMs(style.animations);
  const boundaries = semanticBoundaries(style.animations);
  const scheduledTimes =
    exactDurationMs === null
      ? null
      : Array.from(
          new Set([
            ...Array.from(
              { length: Math.floor(exactDurationMs / INTERNAL_STEP_MS) + 1 },
              (_, index) => index * INTERNAL_STEP_MS
            ),
            ...boundaries.filter(
              (timeMs) => timeMs >= 0 && timeMs <= exactDurationMs
            ),
            exactDurationMs,
          ])
        ).sort((lhs, rhs) => lhs - rhs);
  if (scheduledTimes && scheduledTimes.length > MAX_DENSE_SAMPLES) {
    return null;
  }

  const animation = withStyleAnimation(
    style.animations
  ) as unknown as AnimationObject;
  animation.onStart(
    animation,
    style.initialValues as Record<string, unknown>,
    0,
    undefined
  );

  const timesMs: number[] = [];
  const frames: Array<Record<string, unknown>> = [];
  if (scheduledTimes) {
    for (const timeMs of scheduledTimes) {
      animation.onFrame(animation, timeMs);
      timesMs.push(timeMs);
      frames.push(cloneSnapshot(animation.current as Record<string, unknown>));
    }
    return { durationMs: exactDurationMs!, frames, timesMs };
  }

  for (let index = 0; index < MAX_DENSE_SAMPLES; index++) {
    const timeMs = index * INTERNAL_STEP_MS;
    const finished = animation.onFrame(animation, timeMs);
    timesMs.push(timeMs);
    frames.push(cloneSnapshot(animation.current as Record<string, unknown>));
    if (finished) {
      return { durationMs: timeMs, frames, timesMs };
    }
  }
  return null;
}

function hasInfiniteRepeat(value: unknown): boolean {
  'worklet';
  const pending = [value];
  while (pending.length > 0) {
    const candidate = pending.pop();
    if (Array.isArray(candidate)) {
      pending.push(...candidate);
      continue;
    }
    if (candidate === null || typeof candidate !== 'object') {
      continue;
    }
    const record = candidate as Record<string, unknown>;
    const node = (
      record as unknown as { __nativeAnimation?: NativeAnimationNode }
    ).__nativeAnimation;
    if (node?.kind === 'repeat' && node.count <= 0) {
      return true;
    }
    pending.push(...Object.values(record));
  }
  return false;
}

function interpolateValue(
  from: SampleValue,
  to: SampleValue,
  progress: number
): SampleValue {
  'worklet';
  if (typeof from === 'number' && typeof to === 'number') {
    return from + (to - from) * progress;
  }
  return (from as NativeTransformMatrix).map(
    (value, index) =>
      value + ((to as NativeTransformMatrix)[index] - value) * progress
  ) as NativeTransformMatrix;
}

function projectedPoint(
  matrix: NativeTransformMatrix,
  x: number,
  y: number
): [number, number] {
  'worklet';
  const projectedX = x * matrix[0] + y * matrix[4] + matrix[12];
  const projectedY = x * matrix[1] + y * matrix[5] + matrix[13];
  const projectedW = x * matrix[3] + y * matrix[7] + matrix[15];
  const divisor = Math.abs(projectedW) < 1e-9 ? 1 : projectedW;
  return [projectedX / divisor, projectedY / divisor];
}

function approximationError(
  actual: SampleValue,
  approximated: SampleValue,
  geometry?: NativeLayoutRect
): number {
  'worklet';
  if (typeof actual === 'number' && typeof approximated === 'number') {
    return Math.abs(actual - approximated);
  }
  const width = geometry?.width ?? 1;
  const height = geometry?.height ?? 1;
  let maximum = 0;
  for (const [x, y] of [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ]) {
    const actualPoint = projectedPoint(actual as NativeTransformMatrix, x, y);
    const approximatedPoint = projectedPoint(
      approximated as NativeTransformMatrix,
      x,
      y
    );
    maximum = Math.max(
      maximum,
      Math.hypot(
        actualPoint[0] - approximatedPoint[0],
        actualPoint[1] - approximatedPoint[1]
      )
    );
  }
  return maximum;
}

export function simplifySampledValues(
  timesMs: number[],
  values: SampleValue[],
  tolerance: number,
  forcedTimesMs: number[] = [],
  geometry?: NativeLayoutRect
): { timesMs: number[]; values: SampleValue[] } {
  'worklet';
  if (timesMs.length <= 2) {
    return { timesMs: [...timesMs], values: [...values] };
  }
  const keep = new Set([0, timesMs.length - 1]);
  for (const forcedTime of forcedTimesMs) {
    const index = timesMs.indexOf(forcedTime);
    if (index >= 0) {
      keep.add(index);
    }
  }
  const ranges: Array<[number, number]> = [];
  const forcedIndices = [...keep].sort((lhs, rhs) => lhs - rhs);
  for (let index = 1; index < forcedIndices.length; index++) {
    ranges.push([forcedIndices[index - 1], forcedIndices[index]]);
  }
  while (ranges.length > 0) {
    const [start, end] = ranges.pop()!;
    if (end <= start + 1) {
      continue;
    }
    let maximumError = -1;
    let maximumIndex = -1;
    const span = timesMs[end] - timesMs[start];
    for (let index = start + 1; index < end; index++) {
      const progress =
        span === 0 ? 0 : (timesMs[index] - timesMs[start]) / span;
      const error = approximationError(
        values[index],
        interpolateValue(values[start], values[end], progress),
        geometry
      );
      if (error > maximumError) {
        maximumError = error;
        maximumIndex = index;
      }
    }
    if (maximumError > tolerance) {
      keep.add(maximumIndex);
      ranges.push([start, maximumIndex], [maximumIndex, end]);
    }
  }
  const indices = [...keep].sort((lhs, rhs) => lhs - rhs);
  return {
    timesMs: indices.map((index) => timesMs[index]),
    values: indices.map((index) => values[index]),
  };
}

function numericValue(
  frame: Record<string, unknown>,
  initial: Record<string, unknown>,
  key: string,
  fallback?: number
): number | null {
  'worklet';
  const value = frame[key] ?? initial[key] ?? fallback;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function geometryAt(
  frame: Record<string, unknown>,
  initial: Record<string, unknown>,
  fallback?: NativeLayoutRect
): NativeLayoutRect | null {
  'worklet';
  const originX = numericValue(frame, initial, 'originX', fallback?.originX);
  const originY = numericValue(frame, initial, 'originY', fallback?.originY);
  const width = numericValue(frame, initial, 'width', fallback?.width);
  const height = numericValue(frame, initial, 'height', fallback?.height);
  return originX === null ||
    originY === null ||
    width === null ||
    height === null
    ? null
    : { originX, originY, width, height };
}

export function sampleNativeLayoutAnimation(
  style: LayoutAnimation,
  fallbackOpacity?: number,
  expectedFinalGeometry?: NativeLayoutRect
): NativeSamplingResult {
  'worklet';
  if (hasInfiniteRepeat(style.animations)) {
    return { status: 'fallback', reason: 'infinite-repeat' };
  }
  const dense = sampleDense(style);
  if (!dense) {
    return { status: 'fallback', reason: 'sampling-resource-exhausted' };
  }
  if (dense.durationMs <= 0 || dense.frames.length === 0) {
    return { status: 'fallback', reason: 'invalid-input' };
  }

  const animationKeys = Object.keys(style.animations);
  const initial = style.initialValues as Record<string, unknown>;
  const boundaries = semanticBoundaries(style.animations);
  const tracks: NativeAnimationTrackDescriptor[] = [];
  const needsMatrix =
    animationKeys.includes('transform') ||
    animationKeys.includes('transformOrigin') ||
    animationKeys.includes('width') ||
    animationKeys.includes('height');

  let finalGeometry = expectedFinalGeometry;
  if (needsMatrix) {
    finalGeometry =
      geometryAt(
        dense.frames[dense.frames.length - 1],
        initial,
        finalGeometry
      ) ?? finalGeometry;
    if (
      !finalGeometry ||
      finalGeometry.width <= 0 ||
      finalGeometry.height <= 0
    ) {
      return { status: 'fallback', reason: 'unsupported-value-type' };
    }
    const animatesSize =
      animationKeys.includes('width') || animationKeys.includes('height');
    const matrices: NativeTransformMatrix[] = [];
    for (const frame of dense.frames) {
      const geometry = geometryAt(frame, initial, finalGeometry);
      if (!geometry) {
        return { status: 'fallback', reason: 'unsupported-value-type' };
      }
      const styleMatrix = resolveReactNativeTransformMatrix(
        frame.transform ?? initial.transform,
        geometry.width,
        geometry.height,
        frame.transformOrigin ?? initial.transformOrigin
      );
      const matrix =
        styleMatrix &&
        (animatesSize
          ? composeLayoutFlipMatrix(geometry, finalGeometry, styleMatrix)
          : styleMatrix);
      if (!matrix) {
        return { status: 'fallback', reason: 'unsupported-value-type' };
      }
      matrices.push(matrix);
    }
    const simplified = simplifySampledValues(
      dense.timesMs,
      matrices,
      MATRIX_PROJECTED_CORNER_TOLERANCE_PX,
      boundaries,
      finalGeometry
    );
    tracks.push({
      target: 'transform',
      segments: [{ kind: 'keyframes', ...simplified }],
    });
  }

  for (const target of ['originX', 'originY', 'opacity'] as const) {
    const requested =
      animationKeys.includes(target) ||
      (target === 'opacity' && fallbackOpacity !== undefined);
    if (!requested || (needsMatrix && target !== 'opacity')) {
      continue;
    }
    const values: number[] = [];
    for (const frame of dense.frames) {
      const value = numericValue(
        frame,
        initial,
        target,
        target === 'opacity' ? (fallbackOpacity ?? 1) : undefined
      );
      if (value === null) {
        return { status: 'fallback', reason: 'unsupported-value-type' };
      }
      values.push(value);
    }
    const simplified = simplifySampledValues(
      dense.timesMs,
      values,
      SCALAR_TOLERANCE[target],
      boundaries
    );
    tracks.push({
      target,
      segments: [{ kind: 'keyframes', ...simplified }],
    });
  }

  if (tracks.length === 0) {
    return { status: 'fallback', reason: 'unsupported-value-type' };
  }
  return {
    status: 'native',
    plan: {
      totalDurationMs: dense.durationMs,
      route: 'sampled',
      reason: 'requires-sampling',
      tracks,
      finalGeometry,
    },
  };
}

const TARGET_CODES = {
  opacity: 1,
  originX: 2,
  originY: 3,
  transform: 4,
} as const;
const CODE_TARGETS = ['invalid', 'opacity', 'originX', 'originY', 'transform'];

export function packSampledPlan(
  plan: NativeAnimationPlanDescriptor
): Float64Array {
  const payload = [0x524541, 1, plan.totalDurationMs, plan.tracks.length];
  for (const track of plan.tracks) {
    const segment = track.segments[0];
    if (
      segment?.kind !== 'keyframes' ||
      !(track.target in TARGET_CODES) ||
      segment.values.length === 0
    ) {
      throw new Error(
        '[Reanimated] Only sampled keyframe tracks can be packed.'
      );
    }
    const width = typeof segment.values[0] === 'number' ? 1 : 16;
    payload.push(
      TARGET_CODES[track.target as keyof typeof TARGET_CODES],
      width,
      segment.timesMs.length,
      ...segment.timesMs
    );
    for (const value of segment.values) {
      payload.push(...(typeof value === 'number' ? [value] : value));
    }
  }
  return new Float64Array(payload);
}

export function unpackSampledPlan(
  payload: Float64Array
): NativeAnimationPlanDescriptor {
  if (
    payload.length < 4 ||
    payload[0] !== 0x524541 ||
    payload[1] !== 1 ||
    !Number.isFinite(payload[2])
  ) {
    throw new Error('[Reanimated] Malformed sampled animation payload.');
  }
  let cursor = 4;
  const tracks: NativeAnimationTrackDescriptor[] = [];
  for (let trackIndex = 0; trackIndex < payload[3]; trackIndex++) {
    const target = CODE_TARGETS[payload[cursor++]];
    const width = payload[cursor++];
    const count = payload[cursor++];
    if (
      !target ||
      target === 'invalid' ||
      (width !== 1 && width !== 16) ||
      !Number.isInteger(count) ||
      count < 2 ||
      cursor + count + count * width > payload.length
    ) {
      throw new Error('[Reanimated] Malformed sampled animation track.');
    }
    const timesMs = Array.from(payload.slice(cursor, cursor + count));
    cursor += count;
    const values: SampleValue[] = [];
    for (let index = 0; index < count; index++) {
      if (width === 1) {
        values.push(payload[cursor++]);
      } else {
        values.push(
          Array.from(
            payload.slice(cursor, cursor + 16)
          ) as NativeTransformMatrix
        );
        cursor += 16;
      }
    }
    tracks.push({
      target,
      segments: [{ kind: 'keyframes', timesMs, values }],
    });
  }
  if (cursor !== payload.length) {
    throw new Error('[Reanimated] Malformed sampled animation payload length.');
  }
  return {
    totalDurationMs: payload[2],
    route: 'sampled',
    reason: 'requires-sampling',
    tracks,
  };
}
