import { SnippetError } from './errors';
import { isGeneratorFunction, isGeneratorObject } from './loadSnippet';
import { APP_MS_PER_TICK, INPUT_DEADLINE_MS } from './types';
import type {
  CoreId,
  CoreSnapshot,
  CoreSpec,
  CoreState,
  Frame,
  InterceptedApi,
  Job,
  LoadedSnippet,
  ResourceSnapshot,
  MemorySnapshot,
  PromiseHandle,
  SharedCell,
  PromiseState,
  ScheduleApi,
  ExternalInput,
  ScreenState,
  SimEvent,
  SimulateOptions,
  Snapshot,
  SnippetFn,
  WorkletRuntimeHandle,
} from './types';
import {
  formatLogArgs,
  formatValue,
  isRuntimeHandle,
  jobLabel,
} from './values';
import {
  NEXT_TICK,
  isAwaitMarker,
  readShareableValue,
  setCurrentInterceptor,
} from './worklets';

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
const SNIPPET_FN_TAG = Symbol.for('worklets.snippetFn');

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
  private now = 0;
  private nextJobId = 1;
  private halted = false;
  private events: SimEvent[] = [];
  private activeCore: CoreState | null = null;
  private screen: ScreenState;
  private readonly acquired = new WeakMap<
    object,
    { runtime: CoreId; claim: number }
  >();
  private nextClaim = 1;
  private holders = new Map<CoreId, CoreId>();
  private readonly inputs: ExternalInput[];
  private readonly promises = new Map<number, PromiseState>();
  private nextPromiseId = 1;
  private readonly shared = new Map<number, SharedCell>();
  private nextCellId = 1;
  private readonly readShareable: SnippetFn;

  constructor(snippet: LoadedSnippet, options: SimulateOptions = {}) {
    this.snippet = snippet;
    this.bundleMode = options.bundleMode ?? false;
    this.inputs = [...(options.inputs ?? [])];
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.screen = { ...(options.screen ?? {}) };
    this.readShareable = function* readShareable(id: unknown) {
      return yield readShareableValue(id as number);
    } as unknown as SnippetFn;
    snippet.protoToFn.set(
      this.readShareable.prototype as object,
      this.readShareable
    );
    snippet.fnInfo.set(this.readShareable, {
      name: 'readShareable',
      headerLine: 0,
      endLine: 0,
      yieldLines: [0],
      yieldEnds: [0],
      isNative: false,
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

  get currentTick(): number {
    return this.tickCount;
  }

  addInput(input: ExternalInput): boolean {
    if (input.tick <= this.tickCount) {
      return false;
    }
    if (this.inputs.some((existing) => existing.tick === input.tick)) {
      return false;
    }
    this.inputs.push(input);
    return true;
  }

  tick(now: number = this.now + APP_MS_PER_TICK): Snapshot {
    if (this.isFinished()) {
      return this.snapshot();
    }
    this.events = [];
    this.tickCount += 1;
    this.now = now;
    this.applyInputs();
    const cores = [...this.cores];
    for (const core of cores) {
      this.fireTimers(core);
    }
    for (const core of cores) {
      this.dispatch(core);
    }
    this.arbitrate();
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
      now: this.now,
      resources: this.snapshotResources(),
      cores: this.cores
        .filter((core) => core.createdAtTick < this.tickCount)
        .map((core) => this.snapshotCore(core)),
      events: [...this.events],
      screen: { ...this.screen },
      memory: this.snapshotMemory(),
      finished: this.isFinished(),
    };
  }

  private snapshotResources(): ResourceSnapshot[] {
    const resources: ResourceSnapshot[] = [];
    for (const core of this.cores) {
      if (!core.spec.hasRuntime || core.createdAtTick >= this.tickCount) {
        continue;
      }
      const holder = this.holders.get(core.spec.id) ?? core.spec.id;
      resources.push({
        id: core.spec.id,
        kind: 'runtime',
        label: core.spec.label,
        owner: core.spec.id,
        holder:
          core.status === 'running' || holder !== core.spec.id ? holder : null,
      });
      resources.push({
        id: `loop:${core.spec.id}`,
        kind: 'loop',
        label: `${core.spec.label} event loop`,
        owner: core.spec.id,
        holder: core.spec.id,
      });
    }
    for (const cell of this.shared.values()) {
      if (
        cell.kind === 'synchronizable' &&
        cell.createdAtTick < this.tickCount
      ) {
        resources.push({
          id: `synchronizable:${cell.id}`,
          kind: 'synchronizable',
          label: 'Synchronizable',
          owner: null,
          holder: cell.accessTick === this.tickCount ? cell.accessedBy : null,
        });
      }
    }
    return resources;
  }

  private snapshotMemory(): MemorySnapshot[] {
    return [...this.shared.values()]
      .filter((cell) => cell.createdAtTick < this.tickCount)
      .map((cell) => ({
        id: cell.id,
        kind: cell.kind,
        value: formatValue(cell.value),
        host: cell.host,
        guests: [...cell.guests],
        accessedBy: cell.accessTick === this.tickCount ? cell.accessedBy : null,
      }));
  }

  isFinished(): boolean {
    if (this.cores.some((core) => core.createdAtTick === this.tickCount)) {
      return this.halted;
    }
    if (this.inputs.some((input) => input.tick > this.tickCount)) {
      return this.halted;
    }
    return (
      this.halted ||
      this.cores.every(
        (core) =>
          core.frames.length === 0 &&
          core.macrotasks.length === 0 &&
          core.outbox.length === 0 &&
          core.screenPatches.length === 0 &&
          core.resolutions.length === 0 &&
          core.timers.length === 0
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
    if (api === 'runOnUIAsync') {
      const [fn, ...rest] = args;
      const nativeCaller = core.spec.kind === 'ui' && this.topIsNative(core);
      if (core.spec.kind !== 'rn' && !nativeCaller && !this.bundleMode) {
        throw new Error(BUNDLE_MODE_GUARD_MESSAGE);
      }
      if (!this.core('ui').spec.hasRuntime) {
        throw new SnippetError(
          'runOnUIAsync was called but this simulation has no UI Runtime'
        );
      }
      return this.scheduleAsync(core, api, 'ui', fn, rest);
    }
    if (api === 'runOnRuntimeAsync') {
      const [runtime, fn, ...rest] = args;
      if (!isRuntimeHandle(runtime)) {
        throw new SnippetError(
          'runOnRuntimeAsync expects a runtime created with createWorkletRuntime as its first argument'
        );
      }
      return this.scheduleAsync(core, api, runtime.coreId, fn, rest);
    }
    if (api === 'promiseThen') {
      const [handle, callback] = args as [PromiseHandle, unknown];
      if (typeof callback !== 'function') {
        throw new SnippetError('then expects a function');
      }
      const state = this.promises.get(handle.id);
      if (state === undefined) {
        throw new SnippetError('then was called on an unknown promise');
      }
      if (state.settled) {
        this.queueCallback(
          core,
          callback as (value: unknown) => unknown,
          state.value
        );
      } else {
        state.callbacks.push(callback as (value: unknown) => unknown);
      }
      return undefined;
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
    if (api === 'setTimeout') {
      return this.addTimer(core, args[0], args[1], false);
    }
    if (api === 'setInterval') {
      return this.addTimer(core, args[0], args[1], true);
    }
    if (api === 'clearInterval') {
      for (const candidate of this.cores) {
        candidate.timers = candidate.timers.filter(
          (timer) => timer.id !== args[0]
        );
      }
      return undefined;
    }
    if (api === 'globalGet') {
      return this.globalsOf(core)[String(args[0])];
    }
    if (api === 'globalSet') {
      this.globalsOf(core)[String(args[0])] = args[1];
      return undefined;
    }
    if (api === 'createSynchronizable') {
      return this.createCell(core, 'synchronizable', null, args[0]);
    }
    if (api === 'synchronizableRead') {
      return this.readCell(core, args[0]);
    }
    if (api === 'synchronizableWrite') {
      const cell = this.cell(args[0]);
      const next =
        typeof args[1] === 'function'
          ? (args[1] as (previous: unknown) => unknown)(cell.value)
          : args[1];
      this.writeCell(core, cell, next);
      return undefined;
    }
    if (api === 'createShareable') {
      const host = this.cores.find(
        (candidate) => this.runtimeIdOf(candidate) === args[0]
      );
      if (host === undefined || !host.spec.hasRuntime) {
        throw new SnippetError(
          'createShareable expects the runtimeId of an existing Worklet Runtime'
        );
      }
      return this.createCell(core, 'shareable', host.spec.id, args[1]);
    }
    if (api === 'shareableRead') {
      const cell = this.cell(args[0]);
      this.assertHost(core, cell);
      return this.readCell(core, cell.id);
    }
    if (api === 'shareableWrite') {
      const cell = this.cell(args[0]);
      this.assertHost(core, cell);
      this.writeCell(core, cell, args[1]);
      return undefined;
    }
    if (api === 'shareableGetSync') {
      const cell = this.cell(args[0]);
      this.addGuest(core, cell);
      return this.acquireRuntime(core, cell.host!, [
        this.readShareable,
        cell.id,
      ]);
    }
    if (api === 'shareableGetAsync') {
      const cell = this.cell(args[0]);
      this.addGuest(core, cell);
      cell.accessedBy = core.spec.id;
      cell.accessTick = this.tickCount;
      return this.scheduleAsync(
        core,
        'runOnRuntimeAsync',
        cell.host!,
        this.readShareable,
        [cell.id]
      );
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

  private applyInputs(): void {
    for (const input of this.inputs) {
      if (input.tick !== this.tickCount) {
        continue;
      }
      const core = this.core(input.core);
      const fn = this.snippet.fns.get(input.fn);
      if (fn === undefined) {
        this.fail(
          core,
          new SnippetError(
            `external input targets unknown function ${input.fn}`
          )
        );
        return;
      }
      const job = this.createJob(fn, cloneArgs(input.args ?? []), {
        core: core.spec.id,
        line: 0,
        api: 'sendToUIThread',
        tick: this.tickCount,
      });
      job.deadline = this.now + INPUT_DEADLINE_MS;
      core.macrotasks.push(job);
      this.emit({ type: 'delivered', core: core.spec.id, jobs: [job.label] });
    }
  }

  private addTimer(
    core: CoreState,
    callback: unknown,
    ms: unknown,
    repeat: boolean
  ): number {
    if (typeof callback !== 'function') {
      throw new SnippetError('setTimeout expects a function');
    }
    this.registerFn(callback);
    const delay = typeof ms === 'number' ? ms : 0;
    const gen = (callback as () => unknown)();
    if (!isGeneratorObject(gen)) {
      throw new SnippetError(
        'a setTimeout callback must call an exported snippet function'
      );
    }
    const fn = this.fnOfGenerator(gen as object);
    if (fn === undefined) {
      throw new SnippetError(
        'a setTimeout callback must call an exported snippet function'
      );
    }
    const timerId = this.nextJobId++;
    const wait = Math.max(delay, 0);
    core.timers.push({
      id: timerId,
      due: this.now + wait,
      callback: repeat ? (callback as () => unknown) : () => gen,
      label: this.snippet.fnInfo.get(fn)!.name,
      interval: repeat ? Math.max(wait, APP_MS_PER_TICK) : undefined,
    });
    return timerId;
  }

  private fireTimers(core: CoreState): void {
    const due = core.timers.filter((timer) => timer.due <= this.now);
    if (due.length === 0) {
      return;
    }
    core.timers = core.timers.filter((timer) => timer.due > this.now);
    for (const timer of due) {
      if (timer.interval !== undefined) {
        let next = timer.due + timer.interval;
        while (next <= this.now) {
          next += timer.interval;
        }
        core.timers.push({ ...timer, due: next });
        if (core.macrotasks.some((job) => job.timerId === timer.id)) {
          continue;
        }
      }
      const gen = timer.callback();
      if (!isGeneratorObject(gen)) {
        continue;
      }
      const fn = this.fnOfGenerator(gen as object);
      if (fn === undefined) {
        this.fail(
          core,
          new SnippetError(
            'a timer callback must call an exported snippet function'
          )
        );
        return;
      }
      const info = this.snippet.fnInfo.get(fn)!;
      const job: Job = {
        id: timer.interval === undefined ? timer.id : this.nextJobId++,
        timerId: timer.id,
        dueAt: timer.due,
        fn,
        args: [],
        label: `${info.name}()`,
        origin: {
          core: core.spec.id,
          line: 0,
          api: 'scheduleOnRN',
          tick: this.tickCount,
        },
        gen,
      };
      core.macrotasks.push(job);
    }
  }

  private globalsOf(core: CoreState): Record<string, unknown> {
    const runtime = this.currentRuntime(core);
    if (runtime === null) {
      throw new SnippetError(
        'globalThis is not available without a JavaScript Runtime'
      );
    }
    return this.core(runtime).globals;
  }

  private runtimeIdOf(core: CoreState): number {
    return this.cores.indexOf(core) + 1;
  }

  private cell(id: unknown): SharedCell {
    const cell = this.shared.get(id as number);
    if (cell === undefined) {
      throw new SnippetError('unknown shared memory cell');
    }
    return cell;
  }

  private createCell(
    core: CoreState,
    kind: SharedCell['kind'],
    host: CoreId | null,
    initial: unknown
  ): number {
    const id = this.nextCellId++;
    const cell: SharedCell = {
      id,
      kind,
      value: cloneArgs([initial])[0],
      host,
      guests: new Set(),
      accessedBy: core.spec.id,
      accessTick: this.tickCount,
      createdAtTick: this.tickCount,
    };
    this.shared.set(id, cell);
    if (kind === 'shareable') {
      this.addGuest(core, cell);
    }
    return id;
  }

  private addGuest(core: CoreState, cell: SharedCell): void {
    const runtime = this.currentRuntime(core);
    if (runtime !== null && runtime !== cell.host) {
      cell.guests.add(runtime);
    }
  }

  private readCell(core: CoreState, id: unknown): unknown {
    const cell = this.cell(id);
    cell.accessedBy = core.spec.id;
    cell.accessTick = this.tickCount;
    this.emit({
      type: 'memory',
      core: core.spec.id,
      line: core.line ?? 0,
      cell: cell.id,
      kind: cell.kind,
      mode: 'read',
      value: formatValue(cell.value),
    });
    return cloneArgs([cell.value])[0];
  }

  private writeCell(core: CoreState, cell: SharedCell, value: unknown): void {
    cell.value = cloneArgs([value])[0];
    cell.accessedBy = core.spec.id;
    cell.accessTick = this.tickCount;
    this.emit({
      type: 'memory',
      core: core.spec.id,
      line: core.line ?? 0,
      cell: cell.id,
      kind: cell.kind,
      mode: 'write',
      value: formatValue(cell.value),
    });
  }

  private assertHost(core: CoreState, cell: SharedCell): void {
    if (this.currentRuntime(core) !== cell.host) {
      throw new SnippetError(
        'a Shareable value can be accessed directly only on its Host Runtime; use getSync or getAsync on Guest Runtimes'
      );
    }
  }

  private fnOfGenerator(gen: object): SnippetFn | undefined {
    const known = this.snippet.protoToFn.get(
      Object.getPrototypeOf(gen) as object
    );
    if (known !== undefined) {
      return known;
    }
    const tagged = (gen as Record<symbol, unknown>)[SNIPPET_FN_TAG];
    return this.registerFn(tagged) ? tagged : undefined;
  }

  private registerFn(fn: unknown): fn is SnippetFn {
    if (typeof fn !== 'function') {
      return false;
    }
    if (this.snippet.fnInfo.has(fn as SnippetFn)) {
      return true;
    }
    if (!isGeneratorFunction(fn)) {
      return false;
    }
    const info = this.snippet.infoByName.get(fn.name);
    if (info === undefined) {
      return false;
    }
    this.snippet.fnInfo.set(fn, info);
    this.snippet.protoToFn.set(fn.prototype as object, fn);
    return true;
  }

  private scheduleAsync(
    core: CoreState,
    api: ScheduleApi,
    target: CoreId,
    fn: unknown,
    args: unknown[]
  ): PromiseHandle {
    const id = this.nextPromiseId++;
    this.promises.set(id, {
      origin: core.spec.id,
      settled: false,
      value: undefined,
      callbacks: [],
    });
    const job = this.createJob(
      this.resolveFn(api, fn),
      cloneArgs(args),
      this.origin(core, api)
    );
    job.promiseId = id;
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
    const machine = this;
    return {
      __simPromise: true,
      id,
      then(callback) {
        machine.intercept('promiseThen', [this, callback]);
      },
    };
  }

  private queueCallback(
    core: CoreState,
    callback: (value: unknown) => unknown,
    value: unknown
  ): void {
    this.registerFn(callback);
    const gen = callback(value);
    if (!isGeneratorObject(gen)) {
      this.fail(
        core,
        new SnippetError(
          'a then callback must call an exported snippet function'
        )
      );
      return;
    }
    const fn = this.fnOfGenerator(gen as object);
    if (fn === undefined) {
      this.fail(
        core,
        new SnippetError(
          'a then callback must call an exported snippet function'
        )
      );
      return;
    }
    const job = this.createJob(fn, [value], this.origin(core, 'scheduleOnRN'));
    job.gen = gen;
    core.macrotasks.push(job);
  }

  private awaitValue(
    core: CoreState,
    frame: Frame,
    promise: PromiseHandle
  ): boolean {
    const state = this.promises.get(promise.id);
    if (state === undefined) {
      this.fail(
        core,
        new SnippetError('await was called on an unknown promise')
      );
      return false;
    }
    if (state.settled) {
      frame.lastValue = state.value;
      return false;
    }
    if (core.currentJob === null) {
      this.fail(core, new SnippetError('await outside of a job'));
      return false;
    }
    const job = core.currentJob;
    job.resume = { frames: core.frames, value: undefined };
    core.suspended.push({ job, promiseId: promise.id });
    core.frames = [];
    core.currentJob = null;
    return true;
  }

  private settlePromise(core: CoreState, job: Job): void {
    if (job.promiseId === undefined) {
      return;
    }
    const state = this.promises.get(job.promiseId);
    if (state === undefined) {
      return;
    }
    core.resolutions.push({
      target: state.origin,
      promiseId: job.promiseId,
      value: cloneArgs([core.returnValue])[0],
    });
  }

  private resolvePromise(
    target: CoreState,
    promiseId: number,
    value: unknown
  ): void {
    const state = this.promises.get(promiseId);
    if (state === undefined) {
      return;
    }
    state.settled = true;
    state.value = value;
    const waiting = target.suspended.filter(
      (entry) => entry.promiseId === promiseId
    );
    target.suspended = target.suspended.filter(
      (entry) => entry.promiseId !== promiseId
    );
    for (const { job } of waiting) {
      job.resume = { frames: job.resume?.frames ?? [], value };
      target.macrotasks.push(job);
    }
    for (const callback of state.callbacks) {
      this.queueCallback(target, callback, value);
    }
    state.callbacks = [];
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
    const gen = target(...(cloneArgs(rest) as never[]));
    this.acquired.set(gen as object, { runtime, claim: this.nextClaim++ });
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
    for (const [runtime, holder] of this.holders) {
      if (holder === core.spec.id) {
        held.push(runtime);
      }
    }
    if (core.executedRuntime !== null && !held.includes(core.executedRuntime)) {
      held.push(core.executedRuntime);
    }
    return held;
  }

  private hasStartedJob(core: CoreState): boolean {
    return core.frames.some((frame) => frame.yields > 0);
  }

  private arbitrate(): void {
    this.holders = new Map();
    for (const owner of this.cores) {
      if (!owner.spec.hasRuntime) {
        continue;
      }
      const runtime = owner.spec.id;
      const claimants = this.cores.filter(
        (candidate) =>
          candidate !== owner &&
          candidate.frames.some((frame) => frame.runtime === runtime)
      );
      if (claimants.length === 0 || this.hasStartedJob(owner)) {
        this.holders.set(runtime, runtime);
        continue;
      }
      const active = claimants.find((candidate) =>
        candidate.frames.some(
          (frame) => frame.runtime === runtime && frame.yields > 0
        )
      );
      if (active !== undefined) {
        this.holders.set(runtime, active.spec.id);
        continue;
      }
      const claimOf = (candidate: CoreState) =>
        Math.min(
          ...candidate.frames
            .filter((frame) => frame.runtime === runtime)
            .map((frame) => frame.claim ?? Number.MAX_SAFE_INTEGER)
        );
      claimants.sort((a, b) => claimOf(a) - claimOf(b));
      this.holders.set(runtime, claimants[0].spec.id);
    }
  }

  private holds(core: CoreState, runtime: CoreId): boolean {
    return this.holders.get(runtime) === core.spec.id;
  }

  private tryGrant(core: CoreState, runtime: CoreId | undefined): void {
    if (runtime === undefined || runtime === core.spec.id) {
      return;
    }
    const owner = this.core(runtime);
    if (this.holders.get(runtime) === runtime && !this.hasStartedJob(owner)) {
      this.holders.set(runtime, core.spec.id);
    }
  }

  private currentRuntime(core: CoreState): CoreId | null {
    for (let index = core.frames.length - 1; index >= 0; index--) {
      const runtime = core.frames[index].runtime;
      if (runtime !== undefined && this.holds(core, runtime)) {
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
      core.screenPatches.push(cloneArgs([patch])[0] as ScreenState);
      return;
    }
    this.applyScreenPatch(core, cloneArgs([patch])[0] as ScreenState);
  }

  private applyScreenPatch(core: CoreState, patch: ScreenState): void {
    this.screen = mergeScreenPatch(this.screen, patch);
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
    return {
      __workletRuntime: true,
      name,
      coreId: id,
      runtimeId: this.runtimeIdOf(created),
    };
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
    job.deadline = core.currentJob?.deadline;
    core.macrotasks.push(job);
    this.emit({
      type: 'scheduled',
      core: core.spec.id,
      line: core.line ?? 0,
      api: 'scheduleOnRN',
      target: 'rn',
      job: job.label,
      via: 'same-runtime',
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
    job.deadline = core.currentJob?.deadline;
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
    const job = core.macrotasks.shift();
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
    if (job.resume !== undefined) {
      core.frames = job.resume.frames;
      const top = core.frames[core.frames.length - 1];
      if (top !== undefined) {
        top.lastValue = job.resume.value;
      }
      job.resume = undefined;
      return;
    }
    core.frames.push(this.createFrame(job.fn, job.args, job.gen));
    this.emit({
      type: 'jobStart',
      core: core.spec.id,
      job: job.label,
      internal: this.isInternal(job.fn),
    });
  }

  private execute(core: CoreState): void {
    core.preemptedBy = null;
    if (core.spec.hasRuntime) {
      const holder = this.holders.get(core.spec.id);
      if (holder !== undefined && holder !== core.spec.id) {
        core.preemptedBy = holder;
        core.waitingFor = null;
        core.status = 'running';
        core.line = null;
        core.executedRuntime = null;
        core.executedNative = false;
        core.executedFn = null;
        return;
      }
    }
    const worked = this.settleHidden(core);
    const frame = core.frames[core.frames.length - 1];
    const waiting =
      frame !== undefined && this.snippet.fnInfo.get(frame.fn)!.isHidden;
    if (frame === undefined || waiting || core.status === 'error') {
      core.waitingFor = null;
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
    core.waitingFor = null;
    if (frame.runtime !== undefined && !this.holds(core, frame.runtime)) {
      {
        core.waitingFor = frame.runtime;
        core.status = 'running';
        core.line = null;
        core.executedRuntime = this.currentRuntime(core);
        core.executedNative = false;
        core.executedFn = null;
        return;
      }
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
    if (isAwaitMarker(result.value)) {
      if (this.awaitValue(core, frame, result.value.promise)) {
        core.line = shownLine;
        core.executedRuntime = shownRuntime;
        core.executedNative = shownNative;
        core.executedFn = shownFn;
        return;
      }
      this.unwind(core);
      this.settleHidden(core);
      core.line = shownLine;
      core.executedRuntime = shownRuntime;
      core.executedNative = shownNative;
      core.executedFn = shownFn;
      return;
    }
    if (isGeneratorObject(result.value)) {
      const callee = this.fnOfGenerator(result.value as object);
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
        runtime: this.acquired.get(result.value as object)?.runtime,
        claim: this.acquired.get(result.value as object)?.claim,
      });
      this.tryGrant(core, this.acquired.get(result.value as object)?.runtime);
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
      if (isAwaitMarker(result.value)) {
        if (this.awaitValue(core, frame, result.value.promise)) {
          break;
        }
        continue;
      }
      if (isGeneratorObject(result.value)) {
        const callee = this.fnOfGenerator(result.value as object);
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
          runtime: this.acquired.get(result.value as object)?.runtime,
          claim: this.acquired.get(result.value as object)?.claim,
        });
        this.tryGrant(core, this.acquired.get(result.value as object)?.runtime);
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
    this.now = 0;
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
      return;
    }
    core.returnValue = value;
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
      this.settlePromise(core, core.currentJob);
    }
    core.currentJob = null;
    core.returnValue = undefined;
  }

  private deliver(core: CoreState): void {
    for (const resolution of core.resolutions) {
      this.resolvePromise(
        this.core(resolution.target),
        resolution.promiseId,
        resolution.value
      );
    }
    core.resolutions = [];
    if (core.screenPatches.length > 0) {
      const ui = this.core('ui');
      const merged = core.screenPatches.reduce(
        (patch, next) => mergeScreenPatch(patch, next),
        {} as ScreenState
      );
      core.screenPatches = [];
      this.applyScreenPatch(ui, merged);
    }
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
    if (!this.registerFn(fn)) {
      throw new SnippetError(
        `${api} expects a snippet function as its first argument`
      );
    }
    return fn;
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

  private createFrame(fn: SnippetFn, args: unknown[], gen?: Generator): Frame {
    return {
      fn,
      gen: gen ?? fn(...(args as never[])),
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
      waitingFor:
        core.status !== 'running'
          ? null
          : core.waitingFor !== null
            ? core.waitingFor
            : core.preemptedBy !== null
              ? core.spec.id
              : null,
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
      pending: [
        ...core.macrotasks
          .filter((job) => job.origin !== null)
          .map((job) => ({
            id: job.id,
            name: this.snippet.fnInfo.get(job.fn)!.name,
            internal: this.isInternal(job.fn),
            pastDue:
              (job.dueAt !== undefined && job.dueAt <= this.now) ||
              (job.deadline !== undefined && job.deadline <= this.now),
          })),
        ...[...core.timers]
          .sort((a, b) => a.due - b.due)
          .map((timer) => ({
            id: timer.id,
            name: timer.label,
            internal: false,
            timer: true,
          })),
        ...core.suspended.map(({ job }) => ({
          id: job.id,
          name: this.snippet.fnInfo.get(job.fn)!.name,
          internal: this.isInternal(job.fn),
          awaiting: true,
        })),
      ],
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
    macrotasks: [],
    outbox: [],
    screenPatches: [],
    resolutions: [],
    suspended: [],
    returnValue: undefined,
    globals: {},
    waitingFor: null,
    preemptedBy: null,
    timers: [],
    status: 'idle',
    line: null,
    executedRuntime: null,
    executedNative: false,
    executedFn: null,
    createdAtTick: -1,
    error: null,
  };
}

function mergeScreenPatch(base: ScreenState, patch: ScreenState): ScreenState {
  const baseProps = (base.nativeProps ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const patchProps = (patch.nativeProps ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const nativeProps: Record<string, Record<string, unknown>> = { ...baseProps };
  for (const [id, props] of Object.entries(patchProps)) {
    nativeProps[id] = { ...(nativeProps[id] ?? {}), ...props };
  }
  return { ...base, ...patch, nativeProps };
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
