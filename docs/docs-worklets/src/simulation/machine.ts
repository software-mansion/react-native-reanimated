import { SnippetError } from './errors';
import { isGeneratorObject } from './loadSnippet';
import type {
  CoreId,
  CoreSnapshot,
  CoreSpec,
  CoreState,
  Frame,
  InterceptedApi,
  Job,
  LoadedSnippet,
  ScheduleApi,
  ScreenState,
  SimEvent,
  SimulateOptions,
  Snapshot,
  SnippetFn,
  WorkletRuntimeHandle,
} from './types';
import { formatLogArgs, isRuntimeHandle, jobLabel } from './values';
import { NEXT_TICK, setCurrentInterceptor, updateScreen } from './worklets';

export const CORE_SPECS: CoreSpec[] = [
  {
    id: 'ui',
    label: 'UI Runtime',
    thread: 'UI thread',
    kind: 'ui',
    hasRuntime: true,
  },
  {
    id: 'rn',
    label: 'RN Runtime',
    thread: 'JS thread',
    kind: 'rn',
    hasRuntime: true,
  },
];

export const DEFAULT_MAX_TICKS = 1000;
export const DEFAULT_MAX_DEPTH = 32;
const HIDDEN_STEP_LIMIT = 100;

const BUNDLE_MODE_GUARD_MESSAGE =
  '[Worklets] scheduleOnUI cannot be called on Worklet Runtimes outside of the Bundle Mode.';
const CREATE_RUNTIME_GUARD_MESSAGE =
  '[Worklets] createWorkletRuntime cannot be called on Worklet Runtimes outside of the Bundle Mode.';

export class Machine {
  private readonly snippet: LoadedSnippet;
  private readonly bundleMode: boolean;
  private readonly maxDepth: number;
  private cores: CoreState[];
  private tickCount = 0;
  private nextJobId = 1;
  private halted = false;
  private events: SimEvent[] = [];
  private activeCore: CoreState | null = null;
  private screen: ScreenState;
  private readonly acquired = new WeakMap<object, CoreId>();
  private readonly applyScreen: SnippetFn;

  constructor(snippet: LoadedSnippet, options: SimulateOptions = {}) {
    this.snippet = snippet;
    this.bundleMode = options.bundleMode ?? false;
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.screen = { ...(options.screen ?? {}) };
    this.applyScreen = function* applyScreen(patch: unknown) {
      yield updateScreen(patch as Record<string, unknown>);
    } as unknown as SnippetFn;
    snippet.fnInfo.set(this.applyScreen, {
      name: 'applyScreen',
      headerLine: 0,
      endLine: 0,
      yieldLines: [0],
      yieldEnds: [0],
      isNative: true,
      isHidden: false,
      hasLoop: false,
    });
    const uiRuntime = options.uiRuntime ?? true;
    this.cores = CORE_SPECS.map((spec) =>
      createCore({
        ...spec,
        hasRuntime: spec.kind === 'ui' ? uiRuntime : spec.hasRuntime,
      })
    );
    const entry = snippet.fnInfo.get(snippet.main)!.isNative ? 'ui' : 'rn';
    this.core(entry).macrotasks.push(this.createJob(snippet.main, [], null));
  }

  tick(): Snapshot {
    if (this.isFinished()) {
      return this.snapshot();
    }
    this.events = [];
    this.tickCount += 1;
    const cores = [...this.cores];
    for (const core of cores) {
      this.dispatch(core);
    }
    for (const core of cores) {
      this.execute(core);
    }
    for (const core of this.cores) {
      this.deliver(core);
    }
    return this.snapshot();
  }

  snapshot(): Snapshot {
    return {
      tick: this.tickCount,
      cores: this.cores
        .filter((core) => core.createdAtTick < this.tickCount)
        .map((core) => this.snapshotCore(core)),
      events: [...this.events],
      screen: { ...this.screen },
      finished: this.isFinished(),
    };
  }

  isFinished(): boolean {
    if (this.cores.some((core) => core.createdAtTick === this.tickCount)) {
      return this.halted;
    }
    return (
      this.halted ||
      this.cores.every(
        (core) =>
          core.frames.length === 0 &&
          core.microtasks.length === 0 &&
          core.macrotasks.length === 0 &&
          core.outbox.length === 0
      )
    );
  }

  intercept(api: InterceptedApi, args: unknown[]): unknown {
    const core = this.activeCore;
    if (core === null) {
      throw new SnippetError(`${api} was called outside of a simulation step`);
    }
    if (api === 'createWorkletRuntime') {
      return this.createRuntime(core, args[0]);
    }
    if (api === 'updateScreen') {
      this.updateScreen(core, args[0]);
      return undefined;
    }
    if (api === 'runOnUISync') {
      return this.acquireRuntime(core, 'ui', args);
    }
    if (api === 'runOnRuntimeSync') {
      const [runtime, ...rest] = args;
      if (!isRuntimeHandle(runtime)) {
        throw new SnippetError(
          'runOnRuntimeSync expects a runtime created with createWorkletRuntime as its first argument'
        );
      }
      return this.acquireRuntime(core, runtime.coreId, rest);
    }
    if (api === 'getCurrentThreadId') {
      return threadId(this.cores.indexOf(core));
    }
    if (api === 'sendToUIThread') {
      const [fn, ...rest] = args;
      const target = this.resolveFn(api, fn);
      if (!this.snippet.fnInfo.get(target)!.isNative) {
        throw new SnippetError(
          "sendToUIThread expects a native function (one with a 'native' directive)"
        );
      }
      this.scheduleCrossRuntime(core, api, 'ui', fn, rest);
      return undefined;
    }
    if (api === 'scheduleOnRuntime') {
      const [runtime, fn, ...rest] = args;
      if (!isRuntimeHandle(runtime)) {
        throw new SnippetError(
          'scheduleOnRuntime expects a runtime created with createWorkletRuntime as its first argument'
        );
      }
      const target = this.core(runtime.coreId);
      this.scheduleCrossRuntime(core, api, target.spec.id, fn, rest);
      return undefined;
    }
    const [fn, ...rest] = args;
    if (api === 'scheduleOnUI') {
      const nativeCaller = core.spec.kind === 'ui' && this.topIsNative(core);
      if (core.spec.kind !== 'rn' && !nativeCaller && !this.bundleMode) {
        throw new Error(BUNDLE_MODE_GUARD_MESSAGE);
      }
      if (!this.core('ui').spec.hasRuntime) {
        throw new SnippetError(
          'scheduleOnUI was called but this simulation has no UI Runtime'
        );
      }
      this.scheduleCrossRuntime(core, api, 'ui', fn, rest);
      return undefined;
    }
    if (core.spec.kind === 'rn') {
      this.scheduleMicrotask(core, fn, rest);
      return undefined;
    }
    this.scheduleCrossRuntime(core, api, 'rn', fn, rest);
    return undefined;
  }

  private topIsNative(core: CoreState): boolean {
    const frame = core.frames[core.frames.length - 1];
    return frame !== undefined && this.snippet.fnInfo.get(frame.fn)!.isNative;
  }

  private acquireRuntime(
    core: CoreState,
    runtime: CoreId,
    args: unknown[]
  ): unknown {
    const api = runtime === 'ui' ? 'runOnUISync' : 'runOnRuntimeSync';
    const [fn, ...rest] = args;
    const target = this.resolveFn(api as ScheduleApi, fn);
    if (core.spec.kind !== 'rn' && !this.bundleMode) {
      throw new Error(
        `[Worklets] ${api} cannot be called on Worklet Runtimes outside of the Bundle Mode.`
      );
    }
    const owner = this.core(runtime);
    if (!owner.spec.hasRuntime) {
      throw new SnippetError(
        `${api} was called but this simulation has no ${owner.spec.label}`
      );
    }
    if (owner.frames.length > 0 || this.runtimeHolder(runtime) !== null) {
      throw new SnippetError(`${api}: the ${owner.spec.label} is busy`);
    }
    const gen = target(...(cloneArgs(rest) as never[]));
    this.acquired.set(gen as object, runtime);
    return gen;
  }

  private runtimeHolder(runtime: CoreId): CoreState | null {
    return (
      this.cores.find((candidate) =>
        candidate.frames.some((frame) => frame.runtime === runtime)
      ) ?? null
    );
  }

  private heldRuntimes(core: CoreState): CoreId[] {
    if (core.status !== 'running') {
      return [];
    }
    const held: CoreId[] = [];
    if (core.spec.hasRuntime) {
      held.push(core.spec.id);
    }
    for (const frame of core.frames) {
      if (frame.runtime !== undefined && !held.includes(frame.runtime)) {
        held.push(frame.runtime);
      }
    }
    if (core.executedRuntime !== null && !held.includes(core.executedRuntime)) {
      held.push(core.executedRuntime);
    }
    return held;
  }

  private currentRuntime(core: CoreState): CoreId | null {
    for (let index = core.frames.length - 1; index >= 0; index--) {
      const runtime = core.frames[index].runtime;
      if (runtime !== undefined) {
        return runtime;
      }
    }
    return core.spec.hasRuntime ? core.spec.id : null;
  }

  private updateScreen(core: CoreState, patch: unknown): void {
    if (typeof patch !== 'object' || patch === null) {
      throw new SnippetError('updateScreen expects an object');
    }
    if (core.spec.kind !== 'ui') {
      this.scheduleCrossRuntime(
        core,
        'sendToUIThread',
        'ui',
        this.applyScreen,
        [patch]
      );
      return;
    }
    const next = cloneArgs([patch])[0] as ScreenState;
    const nativeProps = {
      ...((this.screen.nativeProps as Record<string, unknown>) ?? {}),
      ...((next.nativeProps as Record<string, unknown>) ?? {}),
    };
    this.screen = { ...this.screen, ...next, nativeProps };
    this.emit({
      type: 'screen',
      core: core.spec.id,
      line: core.line ?? 0,
      state: { ...this.screen },
    });
  }

  private createRuntime(
    core: CoreState,
    config: unknown
  ): WorkletRuntimeHandle {
    if (core.spec.kind !== 'rn' && !this.bundleMode) {
      throw new Error(CREATE_RUNTIME_GUARD_MESSAGE);
    }
    const name =
      typeof config === 'object' &&
      config !== null &&
      typeof (config as { name?: unknown }).name === 'string'
        ? (config as { name: string }).name
        : this.cores.length > 2
          ? `worker${this.cores.length - 1}`
          : 'worker';
    const id = `worker:${name}`;
    if (this.cores.some((candidate) => candidate.spec.id === id)) {
      throw new SnippetError(`a runtime named "${name}" already exists`);
    }
    const created = createCore({
      id,
      label: 'Worker Runtime',
      thread: `"${name}" thread`,
      kind: 'worker',
      hasRuntime: true,
    });
    created.createdAtTick = this.tickCount;
    this.cores.push(created);
    this.emit({
      type: 'runtimeCreated',
      core: core.spec.id,
      runtime: id,
      name,
    });
    return { __workletRuntime: true, name, coreId: id };
  }

  private scheduleMicrotask(
    core: CoreState,
    fn: unknown,
    args: unknown[]
  ): void {
    const job = this.createJob(
      this.resolveFn('scheduleOnRN', fn),
      args,
      this.origin(core, 'scheduleOnRN')
    );
    core.microtasks.push(job);
    this.emit({
      type: 'scheduled',
      core: core.spec.id,
      line: core.line ?? 0,
      api: 'scheduleOnRN',
      target: 'rn',
      job: job.label,
      via: 'microtask',
      internal: this.isInternal(job.fn),
    });
  }

  private scheduleCrossRuntime(
    core: CoreState,
    api: ScheduleApi,
    target: CoreId,
    fn: unknown,
    args: unknown[]
  ): void {
    const job = this.createJob(
      this.resolveFn(api, fn),
      cloneArgs(args),
      this.origin(core, api)
    );
    core.outbox.push({ target, job });
    this.emit({
      type: 'scheduled',
      core: core.spec.id,
      line: core.line ?? 0,
      api,
      target,
      job: job.label,
      via: 'cross-runtime',
      internal: this.isInternal(job.fn),
    });
  }

  private isInternal(fn: SnippetFn): boolean {
    const info = this.snippet.fnInfo.get(fn)!;
    return info.isHidden || info.isNative;
  }

  private origin(core: CoreState, api: ScheduleApi): Job['origin'] {
    return {
      core: core.spec.id,
      line: core.line ?? 0,
      api,
      tick: this.tickCount,
    };
  }

  private dispatch(core: CoreState): void {
    if (core.frames.length > 0 || core.status === 'error') {
      return;
    }
    if (core.spec.hasRuntime && this.runtimeHolder(core.spec.id) !== null) {
      return;
    }
    const job = core.microtasks.shift() ?? core.macrotasks.shift();
    if (job === undefined) {
      return;
    }
    const info = this.snippet.fnInfo.get(job.fn)!;
    if (!core.spec.hasRuntime && !info.isNative) {
      this.fail(
        core,
        new SnippetError(
          `${info.name} is JavaScript but the ${core.spec.thread} has no JavaScript Runtime`
        )
      );
      return;
    }
    core.currentJob = job;
    core.finishedJob = null;
    core.frames.push(this.createFrame(job.fn, job.args));
    this.emit({
      type: 'jobStart',
      core: core.spec.id,
      job: job.label,
      internal: this.isInternal(job.fn),
    });
  }

  private execute(core: CoreState): void {
    const worked = this.settleHidden(core);
    const frame = core.frames[core.frames.length - 1];
    const waiting =
      frame !== undefined && this.snippet.fnInfo.get(frame.fn)!.isHidden;
    if (frame === undefined || waiting || core.status === 'error') {
      if (core.status !== 'error') {
        core.status = worked ? 'running' : 'idle';
        core.line = null;
        if (!worked) {
          core.executedRuntime = null;
          core.executedNative = false;
        }
      }
      return;
    }
    const info = this.snippet.fnInfo.get(frame.fn)!;
    const lineIndex = info.hasLoop
      ? Math.min(frame.yields, info.yieldLines.length - 1)
      : frame.yields;
    const hasLine = lineIndex < info.yieldLines.length;
    core.status = 'running';
    core.line = hasLine ? info.yieldLines[lineIndex] : info.headerLine;
    core.executedRuntime = this.currentRuntime(core);
    core.executedNative = info.isNative;
    core.executedFn = info.isNative || info.isHidden ? null : info.name;
    this.emit({
      type: 'exec',
      core: core.spec.id,
      line: core.line,
      text: hasLine
        ? `L${core.line} in ${info.name}`
        : `(empty body of ${info.name})`,
    });
    let result: IteratorResult<unknown, unknown>;
    try {
      result = this.step(core, frame);
    } catch (error) {
      this.fail(core, error);
      return;
    }
    const shownLine = core.line;
    const shownRuntime = core.executedRuntime;
    const shownNative = core.executedNative;
    const shownFn = core.executedFn;
    if (result.done) {
      core.frames.pop();
      this.returnTo(core, result.value);
      this.unwind(core);
      this.settleHidden(core);
      core.line = shownLine;
      core.executedRuntime = shownRuntime;
      core.executedNative = shownNative;
      core.executedFn = shownFn;
      return;
    }
    frame.yields += 1;
    if (isGeneratorObject(result.value)) {
      const callee = this.snippet.protoToFn.get(
        Object.getPrototypeOf(result.value) as object
      );
      if (callee === undefined) {
        this.fail(
          core,
          new SnippetError(
            'a yielded generator must come from an exported snippet function'
          )
        );
        return;
      }
      if (core.frames.length >= this.maxDepth) {
        this.fail(
          core,
          new SnippetError(`call stack exceeded ${this.maxDepth} frames`)
        );
        return;
      }
      core.frames.push({
        fn: callee,
        gen: result.value,
        yields: 0,
        lastValue: undefined,
        runtime: this.acquired.get(result.value as object),
      });
      this.settleHidden(core);
      core.line = shownLine;
      core.executedRuntime = shownRuntime;
      core.executedNative = shownNative;
      core.executedFn = shownFn;
      return;
    }
    frame.lastValue = result.value;
    this.unwind(core);
    this.settleHidden(core);
    core.line = shownLine;
    core.executedRuntime = shownRuntime;
    core.executedNative = shownNative;
    core.executedFn = shownFn;
  }

  private settleHidden(core: CoreState): boolean {
    let worked = false;
    let guard = 0;
    while (core.frames.length > 0 && core.status !== 'error') {
      const frame = core.frames[core.frames.length - 1];
      const info = this.snippet.fnInfo.get(frame.fn)!;
      if (!info.isHidden) {
        break;
      }
      if (++guard > HIDDEN_STEP_LIMIT) {
        this.fail(
          core,
          new SnippetError(
            `${info.name} ran more than ${HIDDEN_STEP_LIMIT} hidden steps in one tick`
          )
        );
        break;
      }
      core.line = info.yieldLines[frame.yields] ?? info.headerLine;
      core.executedRuntime = this.currentRuntime(core);
      core.executedNative = false;
      core.executedFn = null;
      let result: IteratorResult<unknown, unknown>;
      try {
        result = this.step(core, frame);
      } catch (error) {
        this.fail(core, error);
        break;
      }
      if (result.done) {
        worked = true;
        core.status = 'running';
        core.frames.pop();
        this.returnTo(core, result.value);
        this.unwind(core);
        continue;
      }
      frame.yields += 1;
      if (result.value === NEXT_TICK) {
        frame.lastValue = undefined;
        break;
      }
      worked = true;
      core.status = 'running';
      if (isGeneratorObject(result.value)) {
        const callee = this.snippet.protoToFn.get(
          Object.getPrototypeOf(result.value) as object
        );
        if (callee === undefined) {
          this.fail(
            core,
            new SnippetError(
              'a yielded generator must come from an exported snippet function'
            )
          );
          break;
        }
        core.frames.push({
          fn: callee,
          gen: result.value,
          yields: 0,
          lastValue: undefined,
          runtime: this.acquired.get(result.value as object),
        });
        continue;
      }
      frame.lastValue = result.value;
      if (frame.yields >= info.yieldLines.length) {
        this.unwind(core);
      }
    }
    return worked;
  }

  skip(ticks: number): void {
    for (let index = 0; index < ticks; index++) {
      this.tick();
    }
    this.tickCount = 0;
    this.events = [];
    for (const core of this.cores) {
      if (core.status === 'running') {
        core.status = 'idle';
        core.line = null;
        core.executedRuntime = null;
        core.executedNative = false;
      }
    }
  }

  private unwind(core: CoreState): void {
    while (core.frames.length > 0) {
      const frame = core.frames[core.frames.length - 1];
      const info = this.snippet.fnInfo.get(frame.fn)!;
      if (info.hasLoop || frame.yields < info.yieldLines.length) {
        return;
      }
      let result: IteratorResult<unknown, unknown>;
      try {
        result = this.step(core, frame);
      } catch (error) {
        this.fail(core, error);
        return;
      }
      if (!result.done) {
        this.fail(
          core,
          new SnippetError(
            `${info.name} yielded more times than it has yield lines; loops around yield are not supported`,
            info.headerLine
          )
        );
        return;
      }
      core.frames.pop();
      this.returnTo(core, result.value);
    }
    this.finishJob(core);
  }

  private returnTo(core: CoreState, value: unknown): void {
    const caller = core.frames[core.frames.length - 1];
    if (caller !== undefined) {
      caller.lastValue = value;
    }
  }

  private finishJob(core: CoreState): void {
    if (core.currentJob !== null) {
      this.emit({
        type: 'jobEnd',
        core: core.spec.id,
        job: core.currentJob.label,
        internal: this.isInternal(core.currentJob.fn),
      });
      core.finishedJob = core.currentJob.label;
    }
    core.currentJob = null;
  }

  private deliver(core: CoreState): void {
    if (core.outbox.length === 0) {
      return;
    }
    const byTarget = new Map<CoreId, Job[]>();
    for (const { target, job } of core.outbox) {
      const list = byTarget.get(target) ?? [];
      list.push(job);
      byTarget.set(target, list);
    }
    core.outbox = [];
    for (const [target, jobs] of byTarget) {
      const targetCore = this.core(target);
      targetCore.macrotasks.push(...jobs);
      this.emit({
        type: 'delivered',
        core: target,
        jobs: jobs.map((job) => job.label),
      });
    }
  }

  private step(
    core: CoreState,
    frame: Frame
  ): IteratorResult<unknown, unknown> {
    const originalLog = console.log;
    this.activeCore = core;
    setCurrentInterceptor(this);
    console.log = (...args: unknown[]) => {
      this.emit({
        type: 'log',
        core: core.spec.id,
        line: core.line ?? 0,
        text: formatLogArgs(args),
      });
    };
    try {
      return frame.gen.next(frame.lastValue);
    } finally {
      console.log = originalLog;
      setCurrentInterceptor(null);
      this.activeCore = null;
    }
  }

  private fail(core: CoreState, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    core.status = 'error';
    core.error = message;
    core.frames = [];
    core.currentJob = null;
    this.halted = true;
    this.emit({ type: 'error', core: core.spec.id, line: core.line, message });
  }

  private resolveFn(api: ScheduleApi, fn: unknown): SnippetFn {
    if (typeof fn !== 'function' || !this.snippet.fnInfo.has(fn as SnippetFn)) {
      throw new SnippetError(
        `${api} expects an exported snippet function as its first argument`
      );
    }
    return fn as SnippetFn;
  }

  private createJob(
    fn: SnippetFn,
    args: unknown[],
    origin: Job['origin']
  ): Job {
    const info = this.snippet.fnInfo.get(fn)!;
    return {
      id: this.nextJobId++,
      fn,
      args,
      label: jobLabel(info.name, args),
      origin,
    };
  }

  private createFrame(fn: SnippetFn, args: unknown[]): Frame {
    return {
      fn,
      gen: fn(...(args as never[])),
      yields: 0,
      lastValue: undefined,
    };
  }

  private core(id: CoreId): CoreState {
    const core = this.cores.find((candidate) => candidate.spec.id === id);
    if (core === undefined) {
      throw new SnippetError(`unknown core ${id}`);
    }
    return core;
  }

  private emit(event: SimEvent): void {
    this.events.push(event);
  }

  private snapshotCore(core: CoreState): CoreSnapshot {
    return {
      id: core.spec.id,
      label: core.spec.label,
      thread: core.spec.thread,
      kind: core.spec.kind,
      hasRuntime: core.spec.hasRuntime,
      runtime: core.status === 'running' ? core.executedRuntime : null,
      heldRuntimes: this.heldRuntimes(core),
      currentFn: core.status === 'running' ? core.executedFn : null,
      nativeFrame: core.status === 'running' && core.executedNative,
      status: core.status,
      line: core.status === 'running' ? core.line : null,
      job:
        core.currentJob?.label ??
        (core.status === 'running' ? core.finishedJob : null),
      callStack: core.frames.map(
        (frame) => this.snippet.fnInfo.get(frame.fn)!.name
      ),
      visibleStack: core.frames
        .filter((frame) => !this.isInternal(frame.fn))
        .map((frame) => this.snippet.fnInfo.get(frame.fn)!.name),
      queue: core.macrotasks
        .filter((job) => job.origin !== null)
        .map((job) => job.label),
      microtasks: core.microtasks.map((job) => job.label),
      pending: [...core.microtasks, ...core.macrotasks]
        .filter((job) => job.origin !== null)
        .map((job) => ({
          name: this.snippet.fnInfo.get(job.fn)!.name,
          internal: this.isInternal(job.fn),
        })),
      error: core.error,
    };
  }
}

function threadId(index: number): string {
  return `0x${(0x7000 + Math.max(index, 0) * 0x400).toString(16)}`;
}

function createCore(spec: CoreSpec): CoreState {
  return {
    spec,
    frames: [],
    currentJob: null,
    finishedJob: null,
    microtasks: [],
    macrotasks: [],
    outbox: [],
    status: 'idle',
    line: null,
    executedRuntime: null,
    executedNative: false,
    executedFn: null,
    createdAtTick: -1,
    error: null,
  };
}

function cloneArgs(args: unknown[]): unknown[] {
  try {
    return structuredClone(args);
  } catch {
    throw new SnippetError(
      'arguments passed between runtimes must be serializable (structuredClone failed)'
    );
  }
}
