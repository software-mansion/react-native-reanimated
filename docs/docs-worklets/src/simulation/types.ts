export type SnippetFn = (
  ...args: never[]
) => Generator<unknown, unknown, unknown>;

export interface SnippetModule {
  default: SnippetFn;
  [name: string]: unknown;
}

export interface FnInfo {
  name: string;
  headerLine: number;
  endLine: number;
  yieldLines: number[];
  yieldEnds: number[];
  isNative: boolean;
  isHidden: boolean;
  hasLoop: boolean;
}

export interface DisplaySource {
  text: string;
  rawToDisplayLine: number[];
  blockEnds: Map<number, number>;
}

export interface LoadedSnippet {
  main: SnippetFn;
  fns: Map<string, SnippetFn>;
  infoByName: Map<string, FnInfo>;
  fnInfo: Map<SnippetFn, FnInfo>;
  protoToFn: Map<object, SnippetFn>;
  display: DisplaySource;
}

export type CoreId = string;

export type CoreKind = 'rn' | 'ui' | 'worker';

export interface CoreSpec {
  id: CoreId;
  label: string;
  thread: string;
  kind: CoreKind;
  hasRuntime: boolean;
}

export type ScheduleApi =
  | 'scheduleOnUI'
  | 'scheduleOnRN'
  | 'scheduleOnRuntime'
  | 'sendToUIThread'
  | 'runOnUIAsync'
  | 'runOnRuntimeAsync';

export type InterceptedApi =
  | ScheduleApi
  | 'createWorkletRuntime'
  | 'updateScreen'
  | 'runOnUISync'
  | 'runOnRuntimeSync'
  | 'getCurrentThreadId'
  | 'setTimeout'
  | 'setInterval'
  | 'clearInterval'
  | 'promiseThen'
  | 'globalGet'
  | 'globalSet'
  | 'createSynchronizable'
  | 'synchronizableRead'
  | 'synchronizableWrite'
  | 'createShareable'
  | 'shareableRead'
  | 'shareableWrite'
  | 'shareableGetSync'
  | 'shareableGetAsync';

export type MemoryKind = 'synchronizable' | 'shareable';

export interface SharedCell {
  id: number;
  kind: MemoryKind;
  value: unknown;
  host: CoreId | null;
  guests: Set<CoreId>;
  accessedBy: CoreId | null;
  accessTick: number;
  createdAtTick: number;
}

export interface MemorySnapshot {
  id: number;
  kind: MemoryKind;
  value: string;
  host: CoreId | null;
  guests: CoreId[];
  accessedBy: CoreId | null;
}

export interface PromiseHandle {
  __simPromise: true;
  id: number;
  then: (callback: (value: unknown) => unknown) => void;
}

export interface AwaitMarker {
  __await: true;
  promise: PromiseHandle;
}

export interface PromiseState {
  origin: CoreId;
  settled: boolean;
  value: unknown;
  callbacks: ((value: unknown) => unknown)[];
}

export type ScreenState = Record<string, unknown>;

export interface WorkletRuntimeHandle {
  __workletRuntime: true;
  name: string;
  coreId: CoreId;
  runtimeId: number;
}

export type ScheduleVia = 'same-runtime' | 'cross-runtime';

export interface JobOrigin {
  core: CoreId;
  line: number;
  api: ScheduleApi;
  tick: number;
}

export interface Job {
  id: number;
  fn: SnippetFn;
  args: unknown[];
  label: string;
  origin: JobOrigin | null;
  gen?: Generator<unknown, unknown, unknown>;
  promiseId?: number;
  timerId?: number;
  dueAt?: number;
  deadline?: number;
  resume?: { frames: Frame[]; value: unknown };
}

export interface Timer {
  id: number;
  due: number;
  callback: () => unknown;
  label: string;
  interval?: number;
}

export interface Frame {
  fn: SnippetFn;
  gen: Generator<unknown, unknown, unknown>;
  yields: number;
  lastValue: unknown;
  runtime?: CoreId;
  claim?: number;
}

export type CoreStatus = 'idle' | 'running' | 'error';

export interface CoreState {
  spec: CoreSpec;
  frames: Frame[];
  currentJob: Job | null;
  finishedJob: string | null;
  macrotasks: Job[];
  outbox: { target: CoreId; job: Job }[];
  screenPatches: ScreenState[];
  resolutions: { target: CoreId; promiseId: number; value: unknown }[];
  suspended: { job: Job; promiseId: number }[];
  returnValue: unknown;
  globals: Record<string, unknown>;
  waitingFor: CoreId | null;
  preemptedBy: CoreId | null;
  timers: Timer[];
  status: CoreStatus;
  line: number | null;
  executedRuntime: CoreId | null;
  executedNative: boolean;
  executedFn: string | null;
  createdAtTick: number;
  error: string | null;
}

export interface CoreSnapshot {
  id: CoreId;
  label: string;
  thread: string;
  kind: CoreKind;
  hasRuntime: boolean;
  nativeFrame: boolean;
  runtime: CoreId | null;
  heldRuntimes: CoreId[];
  waitingFor: string | null;
  currentFn: string | null;
  visibleStack: string[];
  status: CoreStatus;
  line: number | null;
  job: string | null;
  callStack: string[];
  queue: string[];
  pending: PendingJob[];
  error: string | null;
}

export interface PendingJob {
  id: number;
  name: string;
  internal: boolean;
  timer?: boolean;
  awaiting?: boolean;
  pastDue?: boolean;
}

export type SimEvent =
  | {
      type: 'memory';
      core: CoreId;
      line: number;
      cell: number;
      kind: MemoryKind;
      mode: 'read' | 'write';
      value: string;
    }
  | { type: 'jobStart'; core: CoreId; job: string; internal: boolean }
  | { type: 'exec'; core: CoreId; line: number; text: string }
  | { type: 'log'; core: CoreId; line: number; text: string }
  | {
      type: 'scheduled';
      core: CoreId;
      line: number;
      api: ScheduleApi;
      target: CoreId;
      job: string;
      via: ScheduleVia;
      internal: boolean;
    }
  | { type: 'runtimeCreated'; core: CoreId; runtime: CoreId; name: string }
  | { type: 'screen'; core: CoreId; line: number; state: ScreenState }
  | { type: 'delivered'; core: CoreId; jobs: string[] }
  | { type: 'jobEnd'; core: CoreId; job: string; internal: boolean }
  | { type: 'error'; core: CoreId; line: number | null; message: string };

export type ResourceKind = 'runtime' | 'loop' | 'synchronizable';

export interface ResourceSnapshot {
  id: string;
  kind: ResourceKind;
  label: string;
  owner: CoreId | null;
  holder: CoreId | null;
}

export interface Snapshot {
  tick: number;
  now: number;
  resources: ResourceSnapshot[];
  cores: CoreSnapshot[];
  events: SimEvent[];
  screen: ScreenState;
  memory: MemorySnapshot[];
  finished: boolean;
}

export interface ExternalInput {
  tick: number;
  core: CoreId;
  fn: string;
  args?: unknown[];
}

export const FRAME_MS = 16;
export const TICKS_PER_FRAME = 8;
export const APP_MS_PER_TICK = FRAME_MS / TICKS_PER_FRAME;
export const INPUT_DEADLINE_MS = FRAME_MS;
export const MIN_TICK_MS = 16;

export interface SimulateOptions {
  bundleMode?: boolean;
  uiRuntime?: boolean;
  screen?: ScreenState;
  skipTicks?: number;
  durationTicks?: number;
  inputs?: ExternalInput[];
  maxTicks?: number;
  maxDepth?: number;
}
