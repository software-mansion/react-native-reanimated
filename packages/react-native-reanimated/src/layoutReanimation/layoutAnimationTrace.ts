'use strict';

// LayoutAnimationTrace start

/**
 * Internal, development-only schema for comparing layout-animation backends.
 *
 * Timestamps are monotonic milliseconds relative to the start of a trace
 * session. `sequence` is the authoritative event ordering; timestamps are
 * diagnostic and are not expected to match between runs.
 */
export const LAYOUT_ANIMATION_TRACE_SCHEMA_VERSION = 1 as const;

export const LAYOUT_ANIMATION_TRACE_SCENARIOS = [
  'linear-position',
  'position-size-with-text',
  'fade-in-out',
  'slide-in-out',
  'entering-interrupted-by-layout',
  'layout-interrupted-by-layout',
  'exit-during-layout',
  'cancel-before-platform-start',
  'parent-removal-with-flattening',
  'reduced-motion',
  'unsupported-style-property',
  'transform-order-sensitive',
] as const;

export const LAYOUT_ANIMATION_TRACE_EVENTS = [
  'session-started',
  'scenario-reset',
  'scenario-run',
  'scenario-interrupt',
  'scenario-cancel',
  'configuration-queued',
  'configuration-flushed',
  'configuration-stored',
  'mutation-seen',
  'mutation-emitted',
  'removal-delayed',
  'start-requested',
  'ui-runtime-started',
  'descriptor-created',
  'platform-start-scheduled',
  'post-mount-observed',
  'platform-started',
  'native-view-lookup',
  'progress',
  'model-presentation-sample',
  'surface-flush-requested',
  'cancel-requested',
  'platform-completed',
  'logical-completed',
  'callback-invoked',
  'animation-settled',
  'remove-emitted',
  'delete-emitted',
  'assertion',
] as const;

type LayoutAnimationTraceBackend = 'legacy' | 'native';
type LayoutAnimationTraceSource =
  | 'rn-js'
  | 'ui-runtime'
  | 'fabric'
  | 'ios'
  | 'android';
type LayoutAnimationTraceScenario =
  (typeof LAYOUT_ANIMATION_TRACE_SCENARIOS)[number];
type LayoutAnimationTraceEventName =
  (typeof LAYOUT_ANIMATION_TRACE_EVENTS)[number];
type LayoutAnimationTraceMutationType =
  | 'create'
  | 'insert'
  | 'update'
  | 'remove'
  | 'delete';
type LayoutAnimationTraceAnimationType = 'entering' | 'exiting' | 'layout';

type LayoutAnimationTraceJsonValue =
  | null
  | boolean
  | number
  | string
  | LayoutAnimationTraceJsonValue[]
  | { [key: string]: LayoutAnimationTraceJsonValue };

interface LayoutAnimationTracePoint {
  x: number;
  y: number;
}

interface LayoutAnimationTraceSize {
  width: number;
  height: number;
}

interface LayoutAnimationTraceFrame
  extends LayoutAnimationTracePoint, LayoutAnimationTraceSize {}

/** 4x4 transform matrix serialized in m11...m44 field order. */
type LayoutAnimationTraceTransform = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

interface LayoutAnimationTraceLayerValues {
  opacity?: number;
  position?: LayoutAnimationTracePoint;
  bounds?: LayoutAnimationTraceFrame;
  transform?: LayoutAnimationTraceTransform;
}

interface LayoutAnimationTraceValues {
  model?: LayoutAnimationTraceLayerValues;
  presentation?: LayoutAnimationTraceLayerValues;
  hostFrame?: LayoutAnimationTraceFrame;
  accessibilityFrame?: LayoutAnimationTraceFrame;
  hitTestTag?: number | null;
}

interface LayoutAnimationTraceMutation {
  type: LayoutAnimationTraceMutationType;
  parentTag?: number;
  index?: number;
  oldFrame?: LayoutAnimationTraceFrame;
  newFrame?: LayoutAnimationTraceFrame;
}

interface LayoutAnimationTraceAssertion {
  name: string;
  passed: boolean;
  expected?: LayoutAnimationTraceJsonValue;
  actual?: LayoutAnimationTraceJsonValue;
}

interface LayoutAnimationTraceEnvironment {
  commitSha?: string;
  platform: 'ios' | 'android';
  osVersion?: string;
  deviceModel?: string;
  reducedMotion: boolean;
}

export interface LayoutAnimationTraceStartOptions {
  runId: number;
  backend: LayoutAnimationTraceBackend;
  scenario: LayoutAnimationTraceScenario;
  environment?: LayoutAnimationTraceEnvironment;
}

export interface LayoutAnimationTraceEvent {
  schemaVersion: typeof LAYOUT_ANIMATION_TRACE_SCHEMA_VERSION;
  sequence: number;
  runId: number;
  timestampMs: number;
  backend: LayoutAnimationTraceBackend;
  scenario: LayoutAnimationTraceScenario;
  source: LayoutAnimationTraceSource;
  event: LayoutAnimationTraceEventName;

  thread?: string;
  role?: string;
  tag?: number;
  surfaceId?: number;
  animationType?: LayoutAnimationTraceAnimationType;
  generation?: number;
  mutation?: LayoutAnimationTraceMutation;
  values?: LayoutAnimationTraceValues;
  finished?: boolean;
  callbackCount?: number;
  platformAnimationCreated?: boolean;
  assertion?: LayoutAnimationTraceAssertion;
  environment?: LayoutAnimationTraceEnvironment;
  details?: { [key: string]: LayoutAnimationTraceJsonValue };
}

/** Serializes records in the canonical one-record-per-line export format. */
export function serializeLayoutAnimationTrace(
  events: readonly LayoutAnimationTraceEvent[]
): string {
  return events.map((event) => JSON.stringify(event)).join('\n');
}
// LayoutAnimationTrace end
