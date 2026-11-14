import {
  failureText,
  parseLaunchLine,
  parseReportLine,
  scenarioReportOf,
} from './app-report.mts';
import type { LaunchReport, ScenarioReport } from './app-report.mts';
import type { Clock } from './clock.mts';
import { ToolError } from './errors.mts';
import { quantileOrNull } from './frames.mts';
import {
  SAMPLE_LINE_PREFIX,
  THERMAL_STATES,
  appStates,
  highestThermalState,
  parseSampleLine,
  planSeconds,
  readEpoch,
} from './in-app-sample.mts';
import type {
  EpochReading,
  InAppSample,
  SamplePlan,
} from './in-app-sample.mts';
import { LAUNCHED_LINE } from './ios-device.mts';
import type { IosLaunchArguments } from './ios-device.mts';
import { judgeWork } from './judge.mts';
import { RECORDING_SECONDS } from './measurement-rules.mts';
import type { IosSampleMetrics } from './metrics.mts';
import type { InAppState, SampleOrder } from './platform.mts';
import type { LineStream } from './processes.mts';
import {
  COOL_DOWN_LIMIT_MS,
  MINIMUM_WAIT_MS,
  PROCESS_POLL_MS,
  READY_TIMEOUT_MS,
  timedSteps,
} from './samples.mts';
import type { SampleResult, SampleSteps } from './samples.mts';

export interface IosSampleDevice {
  terminate: (bundleIdentifier: string) => Promise<void>;
  launch: (
    bundleIdentifier: string,
    appArguments: IosLaunchArguments,
    onLine: (line: string) => void
  ) => LineStream;
}

export interface IosSampleContext {
  device: IosSampleDevice;
  clock: Clock;
  guard: InAppStateGuard;
}

export interface IosAppOrder {
  applicationId: string;
  stopApplicationIds: readonly string[];
  scenario: string;
  load?: number;
  plan: SamplePlan;
}

export type ReadyReport = ScenarioReport & { jsThread: number };

export type AppStart =
  | { started: true; app: RunningIosApp }
  | { started: false; detail: string };

export type SampleReceipt =
  | { received: true; sample: InAppSample }
  | { received: false; detail: string };

interface AppLaunch {
  applicationId: string;
  appArguments: IosLaunchArguments;
}

type Launch =
  | { started: true; appConsole: AppConsole; report: LaunchReport }
  | { started: false; appConsole: AppConsole; reason: string };

type ReadyOutcome =
  | { ready: true; report: ScenarioReport }
  | { ready: false; reason: string };

interface Received<T> {
  value: T;
  at: number;
}

export const RUN_PLAN: SamplePlan = {
  epochs: [{ load: 'none', collector: 'full', seconds: RECORDING_SECONDS }],
  start: 'ready',
};

const REPORT_PREFIX = 'ReanimatedBenchmark: ';

const HOT_DEVICE_WAIT_MS = 30_000;

const NOMINAL_THERMAL_STATE = 0;

const SUPPORTED_REFRESH_RATE = 60;

const SAMPLE_MARGIN_MS = 30_000;

const NOTIFICATION_WAIT_MS = 120_000;

export async function takeIosSample(
  order: SampleOrder,
  context: IosSampleContext
): Promise<SampleResult> {
  const steps = timedSteps(context.clock);
  const start = await startIosApp(
    {
      applicationId: order.applicationId,
      stopApplicationIds: order.stopApplicationIds,
      scenario: order.scenario,
      load: order.load,
      plan: RUN_PLAN,
    },
    context,
    steps
  );
  if (!start.started) {
    return {
      valid: false,
      cause: 'crash',
      detail: start.detail,
      timings: steps.timings,
    };
  }
  return withCleanup(
    () => measureRunSample(start.app, order, context, steps),
    () => start.app.close()
  );
}

export async function startIosApp(
  order: IosAppOrder,
  context: IosSampleContext,
  steps: SampleSteps
): Promise<AppStart> {
  for (const applicationId of order.stopApplicationIds) {
    await context.device.terminate(applicationId);
  }
  const launch = await steps.timed('wait', () =>
    launchOnCoolDevice(
      {
        applicationId: order.applicationId,
        appArguments: {
          scenario: order.scenario,
          load: order.load,
          plan: order.plan,
        },
      },
      context
    )
  );
  const { appConsole } = launch;
  if (!launch.started) {
    await appConsole.close();
    return { started: false, detail: launch.reason };
  }
  return withCleanupOnError(
    async (): Promise<AppStart> => {
      const ready = await steps.timed('ready', () =>
        waitForReady(appConsole, context.clock)
      );
      if (!ready.ready) {
        await appConsole.close();
        return { started: false, detail: ready.reason };
      }
      return {
        started: true,
        app: new RunningIosApp(
          appConsole,
          launch.report,
          readyReport(ready.report, launch.report, order.applicationId),
          order.plan,
          context.clock
        ),
      };
    },
    () => appConsole.close()
  );
}

export async function launchOnce(
  device: IosSampleDevice,
  applicationId: string,
  clock: Clock
) {
  const launch = await startLaunch(device, clock, {
    applicationId,
    appArguments: {},
  });
  await withCleanup(
    async () => {
      if (!launch.started) {
        throw new ToolError(
          `${applicationId} did not write a LAUNCH line in its first launch after the install: ${launch.reason}`
        );
      }
    },
    () => launch.appConsole.close()
  );
}

export class RunningIosApp {
  readonly launch: LaunchReport;
  readonly report: ReadyReport;
  readonly #appConsole: AppConsole;
  readonly #plan: SamplePlan;
  readonly #clock: Clock;

  constructor(
    appConsole: AppConsole,
    launch: LaunchReport,
    report: ReadyReport,
    plan: SamplePlan,
    clock: Clock
  ) {
    this.#appConsole = appConsole;
    this.launch = launch;
    this.report = report;
    this.#plan = plan;
    this.#clock = clock;
  }

  get pid(): number {
    return this.launch.pid;
  }

  async waitForSample(stop?: AbortSignal): Promise<SampleReceipt> {
    const limitMs =
      planSeconds(this.#plan) * 1000 +
      SAMPLE_MARGIN_MS +
      (this.#plan.start === 'notification' ? NOTIFICATION_WAIT_MS : 0);
    const deadline = this.#clock.now() + limitMs;
    const stopped = untilAborted(stop);
    while (true) {
      const text = this.#appConsole.sampleText();
      if (text !== null) {
        return { received: true, sample: this.#checkedSample(text) };
      }
      const failure = this.failure();
      if (failure !== null) {
        return { received: false, detail: failure };
      }
      if (stop?.aborted) {
        return {
          received: false,
          detail: 'the driver stopped the wait for the SAMPLE line',
        };
      }
      if (this.#clock.now() >= deadline) {
        return {
          received: false,
          detail: `no SAMPLE line in ${limitMs / 1000} s after READY`,
        };
      }
      await Promise.race([this.#clock.sleep(PROCESS_POLL_MS), stopped]);
    }
  }

  failure(): string | null {
    return (
      this.#appConsole.failure() ??
      (this.#appConsole.ended()
        ? `the app process ${this.pid} ended before its SAMPLE line`
        : null)
    );
  }

  close(): Promise<void> {
    return this.#appConsole.close();
  }

  #checkedSample(text: string): InAppSample {
    const sample = parseSampleLine(text, this.#plan);
    if (
      sample.mainThread !== this.launch.mainThread ||
      sample.jsThread !== this.report.jsThread
    ) {
      throw new ToolError(
        `The SAMPLE line measured the threads ${sample.mainThread} and ${sample.jsThread}, the LAUNCH and READY lines name the main thread ${this.launch.mainThread} and the JS thread ${this.report.jsThread}`
      );
    }
    return sample;
  }
}

export class InAppStateGuard {
  #reference: InAppState | null;

  constructor(reference: InAppState | null) {
    this.#reference = reference;
  }

  check(state: InAppState) {
    this.#reference ??= state;
    const reference = this.#reference;
    const changes = Object.keys(reference)
      .filter((key) => reference[key] !== state[key])
      .map((key) => `${key}: ${reference[key]} -> ${state[key]}`);
    if (changes.length > 0) {
      throw new ToolError(
        `The device state changed (read by the app): ${changes.join(', ')}`
      );
    }
  }
}

export function inAppStatesOf(
  sample: InAppSample,
  refreshRate: number
): InAppState[] {
  return appStates(sample).map((state) => ({ refreshRate, ...state }));
}

async function measureRunSample(
  app: RunningIosApp,
  order: SampleOrder,
  context: IosSampleContext,
  steps: SampleSteps
): Promise<SampleResult> {
  const { refreshRate, coldStart } = app.launch;
  const observed = {
    report: app.report,
    pid: app.pid,
    refreshRate,
    timings: steps.timings,
  };
  const receipt = await steps.timed('measure', () => app.waitForSample());
  if (!receipt.received) {
    return {
      valid: false,
      cause: 'crash',
      detail: receipt.detail,
      ...observed,
    };
  }
  await app.close();
  const { sample } = receipt;
  const reading = await steps.timed('parse', async () =>
    readEpoch(sample, 0, refreshRate)
  );
  const states = inAppStatesOf(sample, refreshRate);
  states.forEach((state) => context.guard.check(state));
  const thermalState = highestThermalState(sample);
  const measured = {
    ...observed,
    thermalAfter: thermalState,
    traceWindow: reading.window,
    inAppState: states[0],
    metrics: runMetrics(reading, coldStart),
  };
  if (thermalState > NOMINAL_THERMAL_STATE) {
    return {
      valid: false,
      cause: 'thermal',
      detail: `thermal state ${THERMAL_STATES[thermalState] ?? thermalState} in the sample window`,
      ...measured,
    };
  }
  return judgeWork(measured, order.scenario);
}

function runMetrics(
  reading: EpochReading,
  coldStart: number
): IosSampleMetrics {
  const { updates } = reading;
  if (updates === null) {
    throw new ToolError('The sample epoch has no UI update data');
  }
  const durations = updates.durationsMs;
  return {
    uiUpdateDurationMedian: quantileOrNull(durations, 0.5),
    uiUpdateDurationP90: quantileOrNull(durations, 0.9),
    uiUpdateDurationP95: quantileOrNull(durations, 0.95),
    uiUpdateDurationP99: quantileOrNull(durations, 0.99),
    missedDisplayLinkCallbacks: updates.missedDisplayLinkCallbacks,
    frameCount: durations.length,
    expectedFrameCount: updates.expectedSlots,
    ...reading.cpu,
    mountBatchCount: reading.mountBatchCount,
    memory: reading.memory,
    windowMemoryDelta: reading.windowMemoryDelta,
    coldStart,
  };
}

function readyReport(
  report: ScenarioReport,
  launch: LaunchReport,
  applicationId: string
): ReadyReport {
  const { jsThread } = report;
  if (jsThread === null) {
    throw new ToolError(
      `The READY line of ${applicationId} has no jsThread field. Build the app again from the current benchmark app source.`
    );
  }
  if (launch.refreshRate !== SUPPORTED_REFRESH_RATE) {
    throw new ToolError(
      `The display of the device has a maximum refresh rate of ${launch.refreshRate} Hz. The driver supports only a display with a fixed rate of ${SUPPORTED_REFRESH_RATE} Hz.`
    );
  }
  return { ...report, jsThread };
}

async function launchOnCoolDevice(
  launch: AppLaunch,
  { device, clock }: IosSampleContext
): Promise<Launch> {
  const startedAt = clock.now();
  await clock.sleep(MINIMUM_WAIT_MS);
  while (true) {
    const started = await startLaunch(device, clock, launch);
    if (
      !started.started ||
      started.report.thermalState === NOMINAL_THERMAL_STATE
    ) {
      return started;
    }
    await started.appConsole.close();
    if (clock.now() - startedAt >= COOL_DOWN_LIMIT_MS) {
      throw new ToolError(
        `The device did not settle in ${COOL_DOWN_LIMIT_MS / 60_000} minutes: thermal state ${THERMAL_STATES[started.report.thermalState] ?? started.report.thermalState} at the launch of the app`
      );
    }
    await clock.sleep(HOT_DEVICE_WAIT_MS);
  }
}

async function startLaunch(
  device: IosSampleDevice,
  clock: Clock,
  launch: AppLaunch
): Promise<Launch> {
  const appConsole = new AppConsole(device, clock, launch);
  return withCleanupOnError(
    async (): Promise<Launch> => {
      const report = await waitForLaunch(appConsole, clock);
      return typeof report === 'string'
        ? { started: false, appConsole, reason: report }
        : { started: true, appConsole, report };
    },
    () => appConsole.close()
  );
}

class AppConsole {
  readonly #device: IosSampleDevice;
  readonly #clock: Clock;
  readonly #launch: AppLaunch;
  readonly #stream: LineStream;
  #launched = false;
  #launchReport: Received<LaunchReport> | null = null;
  #scenarioReport: Received<ScenarioReport> | null = null;
  #sampleText: string | null = null;
  #failure: string | null = null;
  #closing: Promise<void> | null = null;

  constructor(device: IosSampleDevice, clock: Clock, launch: AppLaunch) {
    this.#device = device;
    this.#clock = clock;
    this.#launch = launch;
    this.#stream = device.launch(
      launch.applicationId,
      launch.appArguments,
      (line) => this.#read(line)
    );
  }

  launchBefore(deadline: number): LaunchReport | null {
    return valueBefore(this.#launchReport, deadline);
  }

  hasScenarioReportBefore(deadline: number): boolean {
    return valueBefore(this.#scenarioReport, deadline) !== null;
  }

  readyBefore(deadline: number): ReadyOutcome | null {
    if (this.#failure) {
      return { ready: false, reason: this.#failure };
    }
    const report = valueBefore(this.#scenarioReport, deadline);
    return report ? { ready: true, report } : null;
  }

  sampleText(): string | null {
    return this.#sampleText;
  }

  failure(): string | null {
    return this.#failure;
  }

  started(): boolean {
    return this.#launched;
  }

  ended(): boolean {
    const streamFailure = this.#stream.failure();
    if (streamFailure && !this.#launched) {
      throw new ToolError(`The app did not start: ${streamFailure.message}`);
    }
    return streamFailure !== null;
  }

  close(): Promise<void> {
    this.#closing ??= (async () => {
      this.#stream.stop();
      await this.#device.terminate(this.#launch.applicationId);
    })();
    return this.#closing;
  }

  #read(line: string) {
    if (LAUNCHED_LINE.test(line)) {
      this.#launched = true;
    }
    if (!line.startsWith(REPORT_PREFIX)) {
      return;
    }
    const text = line.slice(REPORT_PREFIX.length);
    if (text.startsWith(SAMPLE_LINE_PREFIX)) {
      this.#sampleText ??= text.slice(SAMPLE_LINE_PREFIX.length);
      return;
    }
    const at = this.#clock.now();
    const launch = parseLaunchLine(text);
    if (launch) {
      this.#launchReport ??= { value: launch, at };
    }
    const report = parseReportLine(text);
    if (report?.kind === 'failed') {
      this.#failure ??= failureText(report);
    } else if (
      report &&
      report.scenario === this.#launch.appArguments.scenario
    ) {
      this.#scenarioReport ??= { value: scenarioReportOf(report), at };
    }
  }
}

function valueBefore<T>(received: Received<T> | null, deadline: number) {
  return received !== null && received.at < deadline ? received.value : null;
}

async function waitForLaunch(
  appConsole: AppConsole,
  clock: Clock
): Promise<LaunchReport | string> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (true) {
    const report = appConsole.launchBefore(deadline);
    if (report) {
      return report;
    }
    if (appConsole.hasScenarioReportBefore(deadline)) {
      throw new ToolError(
        'The app wrote READY but no LAUNCH line that the driver can read. Build the app again from the current benchmark app source.'
      );
    }
    const failure = appConsole.failure();
    if (failure) {
      return failure;
    }
    if (appConsole.ended()) {
      return 'the app process ended';
    }
    if (clock.now() >= deadline) {
      if (!appConsole.started()) {
        throw new ToolError(
          `The launch command did not start the app in ${READY_TIMEOUT_MS / 1000} s`
        );
      }
      return `no LAUNCH line in ${READY_TIMEOUT_MS / 1000} s`;
    }
    await clock.sleep(PROCESS_POLL_MS);
  }
}

async function waitForReady(
  appConsole: AppConsole,
  clock: Clock
): Promise<ReadyOutcome> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (clock.now() < deadline) {
    const outcome = appConsole.readyBefore(deadline);
    if (outcome) {
      return outcome;
    }
    if (appConsole.ended()) {
      return (
        appConsole.readyBefore(deadline) ?? {
          ready: false,
          reason: 'the app process ended',
        }
      );
    }
    await clock.sleep(PROCESS_POLL_MS);
  }
  return {
    ready: false,
    reason: `no READY line in ${READY_TIMEOUT_MS / 1000} s`,
  };
}

async function withCleanup<T>(
  action: () => Promise<T>,
  cleanUp: () => Promise<void>
): Promise<T> {
  const result = await withCleanupOnError(action, cleanUp);
  await cleanUp();
  return result;
}

async function withCleanupOnError<T>(
  action: () => Promise<T>,
  cleanUp: () => Promise<void>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    await cleanUp().catch(() => {});
    throw error;
  }
}

function untilAborted(signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) =>
    signal?.addEventListener('abort', () => resolve(), { once: true })
  );
}
