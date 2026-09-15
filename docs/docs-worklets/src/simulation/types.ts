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
  | 'sendToUIThread';

export type InterceptedApi =
  | ScheduleApi
  | 'createWorkletRuntime'
  | 'updateScreen'
  | 'runOnUISync'
  | 'runOnRuntimeSync'
  | 'getCurrentThreadId';

export type ScreenState = Record<string, unknown>;

export interface WorkletRuntimeHandle {
  __workletRuntime: true;
  name: string;
  coreId: CoreId;
}

export type ScheduleVia = 'microtask' | 'cross-runtime';

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
}

export interface Frame {
  fn: SnippetFn;
  gen: Generator<unknown, unknown, unknown>;
  yields: number;
  lastValue: unknown;
  runtime?: CoreId;
}

export type CoreStatus = 'idle' | 'running' | 'error';

export interface CoreState {
  spec: CoreSpec;
  frames: Frame[];
  currentJob: Job | null;
  finishedJob: string | null;
  microtasks: Job[];
  macrotasks: Job[];
  outbox: { target: CoreId; job: Job }[];
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
  currentFn: string | null;
  visibleStack: string[];
  status: CoreStatus;
  line: number | null;
  job: string | null;
  callStack: string[];
  queue: string[];
  microtasks: string[];
  pending: PendingJob[];
  error: string | null;
}

export interface PendingJob {
  name: string;
  internal: boolean;
}

export type SimEvent =
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

export interface Snapshot {
  tick: number;
  cores: CoreSnapshot[];
  events: SimEvent[];
  screen: ScreenState;
  finished: boolean;
}

export interface SimulateOptions {
  bundleMode?: boolean;
  uiRuntime?: boolean;
  screen?: ScreenState;
  skipTicks?: number;
  maxTicks?: number;
  maxDepth?: number;
}
