import { ToolError } from './errors.mts';
import { LAUNCHED_LINE } from './ios-device.mts';
import type { InAppState, SampleOrder } from './platform.mts';
import {
  COOL_DOWN_LIMIT_MS,
  PROCESS_POLL_MS,
  READY_TIMEOUT_MS,
  judgeWork,
  parseReportLine,
  timedSteps,
} from './protocol.mts';
import type {
  Clock,
  InvalidSample,
  SampleResult,
  SampleSteps,
  ScenarioReport,
} from './protocol.mts';
import { IOS_MINIMUM_MOUNT_BATCHES } from './scenarios.mts';
import { once } from './tools.mts';
import type { LineStream } from './tools.mts';
import { THERMAL_STATES } from './xctrace-metrics.mts';
import type { AppState } from './xctrace-metrics.mts';
import type { IosTracer } from './xctrace.mts';

export interface IosSampleDevice {
  terminate: (bundleIdentifier: string) => Promise<void>;
  launch: (
    bundleIdentifier: string,
    scenario: string | undefined,
    load: number | undefined,
    onLine: (line: string) => void
  ) => LineStream;
}

export interface IosSampleContext {
  device: IosSampleDevice;
  deviceName: string;
  tracer: IosTracer;
  clock: Clock;
  guard: InAppStateGuard;
}

export interface LaunchReport {
  pid: number;
  mainThread: number;
  refreshRate: number;
  thermalState: number;
  coldStart: number;
}

type ReadyOutcome =
  | { ready: true; launch: LaunchReport; report: ScenarioReport }
  | { ready: false; reason: string };

export const REPORT_PREFIX = 'ReanimatedBenchmark: ';
export const MINIMUM_WAIT_MS = 10_000;
export const HOT_DEVICE_WAIT_MS = 30_000;
export const NOMINAL_THERMAL_STATE = 0;
export const SUPPORTED_REFRESH_RATE = 60;

export async function takeIosSample(
  order: SampleOrder,
  context: IosSampleContext
): Promise<SampleResult> {
  const { device } = context;
  const steps = timedSteps(context.clock);
  for (const applicationId of order.stopApplicationIds) {
    await device.terminate(applicationId);
  }
  const appConsole = await steps.timed('wait', () =>
    launchOnCoolDevice(order, context)
  );
  const stopApp = once(() => device.terminate(order.applicationId));
  try {
    return await measureLaunchedApp(order, context, appConsole, steps, stopApp);
  } finally {
    appConsole.stop();
    await stopApp();
  }
}

export async function launchOnce(
  device: IosSampleDevice,
  applicationId: string,
  clock: Clock
) {
  const appConsole = new AppConsole(
    device,
    applicationId,
    undefined,
    undefined
  );
  try {
    if ((await waitForLaunch(appConsole, clock)) === null) {
      throw new ToolError(
        `${applicationId} did not write a LAUNCH line in its first launch after the install`
      );
    }
  } finally {
    appConsole.stop();
    await device.terminate(applicationId);
  }
}

export function parseLaunchLine(line: string): LaunchReport | null {
  const launch =
    /^LAUNCH pid=(\d+) mainThread=(\d+) refreshRate=(\d+) thermal=(\d+) coldStart=(\d+(?:\.\d+)?)$/.exec(
      line.trim()
    );
  return launch
    ? {
        pid: Number(launch[1]),
        mainThread: Number(launch[2]),
        refreshRate: Number(launch[3]),
        thermalState: Number(launch[4]),
        coldStart: Number(launch[5]),
      }
    : null;
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
        `The device state changed (read in the trace): ${changes.join(', ')}`
      );
    }
  }
}

export class AppConsole {
  readonly #scenario: string | undefined;
  readonly #stream: LineStream;
  #launched = false;
  #launch: LaunchReport | null = null;
  #report: ScenarioReport | null = null;
  #failure: string | null = null;

  constructor(
    device: IosSampleDevice,
    applicationId: string,
    scenario: string | undefined,
    load: number | undefined
  ) {
    this.#scenario = scenario;
    this.#stream = device.launch(applicationId, scenario, load, (line) =>
      this.#read(line)
    );
  }

  launch(): LaunchReport | null {
    return this.#launch;
  }

  readyOutcome(): ReadyOutcome | null {
    if (this.#failure) {
      return { ready: false, reason: this.#failure };
    }
    if (this.#report && !this.#launch) {
      throw new ToolError(
        'The app wrote READY but no LAUNCH line that the driver can read. Build the app again from the current benchmark app source.'
      );
    }
    return this.#report && this.#launch
      ? { ready: true, launch: this.#launch, report: this.#report }
      : null;
  }

  failure(): string | null {
    return this.#failure;
  }

  ended(): boolean {
    const streamFailure = this.#stream.failure();
    if (streamFailure && !this.#launched) {
      throw new ToolError(`The app did not start: ${streamFailure.message}`);
    }
    return streamFailure !== null;
  }

  stop() {
    this.#stream.stop();
  }

  #read(line: string) {
    if (LAUNCHED_LINE.test(line)) {
      this.#launched = true;
    }
    if (!line.startsWith(REPORT_PREFIX)) {
      return;
    }
    const text = line.slice(REPORT_PREFIX.length);
    this.#launch ??= parseLaunchLine(text);
    const report = parseReportLine(text);
    if (report?.kind === 'failed') {
      this.#failure ??= `FAILED scenario=${report.scenario} reason=${report.reason}`;
    } else if (report && report.scenario === this.#scenario) {
      this.#report ??= {
        version: report.version,
        load: report.load,
        jsThread: report.jsThread,
      };
    }
  }
}

async function launchOnCoolDevice(
  order: SampleOrder,
  { device, clock }: IosSampleContext
): Promise<AppConsole> {
  const startedAt = clock.now();
  await clock.sleep(MINIMUM_WAIT_MS);
  while (true) {
    const appConsole = new AppConsole(
      device,
      order.applicationId,
      order.scenario,
      order.load
    );
    const thermalState =
      (await waitForLaunch(appConsole, clock))?.thermalState ??
      NOMINAL_THERMAL_STATE;
    if (thermalState === NOMINAL_THERMAL_STATE) {
      return appConsole;
    }
    appConsole.stop();
    await device.terminate(order.applicationId);
    if (clock.now() - startedAt >= COOL_DOWN_LIMIT_MS) {
      throw new ToolError(
        `The device did not settle in ${COOL_DOWN_LIMIT_MS / 60_000} minutes: thermal state ${THERMAL_STATES[thermalState] ?? thermalState} at the launch of the app`
      );
    }
    await clock.sleep(HOT_DEVICE_WAIT_MS);
  }
}

async function waitForLaunch(
  appConsole: AppConsole,
  clock: Clock
): Promise<LaunchReport | null> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (
    appConsole.launch() === null &&
    appConsole.failure() === null &&
    !appConsole.ended() &&
    clock.now() < deadline
  ) {
    await clock.sleep(PROCESS_POLL_MS);
  }
  return appConsole.launch();
}

async function measureLaunchedApp(
  order: SampleOrder,
  context: IosSampleContext,
  appConsole: AppConsole,
  steps: SampleSteps,
  stopApp: () => Promise<void>
): Promise<SampleResult> {
  const { tracer, guard } = context;
  const { applicationId, traceFile } = order;
  const { timings, timed } = steps;
  const ready = await timed('ready', () =>
    waitForReady(appConsole, context.clock)
  );
  if (!ready.ready) {
    return { valid: false, cause: 'crash', detail: ready.reason, timings };
  }
  const { launch, report } = ready;
  const { jsThread } = report;
  if (jsThread === null) {
    throw new ToolError(
      `The READY line of ${applicationId} has no jsThread field. Build the app again from the current benchmark app source.`
    );
  }
  const { pid, refreshRate } = launch;
  if (refreshRate !== SUPPORTED_REFRESH_RATE) {
    throw new ToolError(
      `The display of the device has a maximum refresh rate of ${refreshRate} Hz. The driver supports only a display with a fixed rate of ${SUPPORTED_REFRESH_RATE} Hz.`
    );
  }
  const observed = { report, pid, refreshRate, timings };

  await timed('trace', () => tracer.record(context.deviceName, pid, traceFile));
  const ended =
    appConsole.failure() ??
    (appConsole.ended()
      ? `the app process ${pid} ended during the trace`
      : null);
  if (ended !== null) {
    return crash(ended, observed, traceFile);
  }
  await stopApp();

  const reading = await timed('parse', () =>
    tracer.collect(traceFile, {
      pid,
      mainThread: launch.mainThread,
      jsThread,
      refreshRate,
    })
  );
  if (!reading.processLived) {
    return crash(reading.detail, observed, traceFile);
  }
  const states = reading.appStates.map((state) =>
    inAppStateOf(state, refreshRate)
  );
  states.forEach((state) => guard.check(state));
  const measured = {
    ...observed,
    thermalAfter: reading.thermalState,
    inAppState: states[0],
    metrics: { ...reading.metrics, coldStart: launch.coldStart },
  };
  if (reading.thermalState > NOMINAL_THERMAL_STATE) {
    return {
      valid: false,
      cause: 'thermal',
      detail: `thermal state ${THERMAL_STATES[reading.thermalState]} during the trace`,
      trace: traceFile,
      ...measured,
    };
  }
  return judgeWork(
    measured,
    order,
    IOS_MINIMUM_MOUNT_BATCHES[order.scenario] ?? 0
  );
}

async function waitForReady(
  appConsole: AppConsole,
  clock: Clock
): Promise<ReadyOutcome> {
  const deadline = clock.now() + READY_TIMEOUT_MS;
  while (clock.now() < deadline) {
    const outcome = appConsole.readyOutcome();
    if (outcome) {
      return outcome;
    }
    if (appConsole.ended()) {
      return (
        appConsole.readyOutcome() ?? {
          ready: false,
          reason: 'the app process ended',
        }
      );
    }
    await clock.sleep(PROCESS_POLL_MS);
  }
  return (
    appConsole.readyOutcome() ?? {
      ready: false,
      reason: `no READY line in ${READY_TIMEOUT_MS / 1000} s`,
    }
  );
}

function crash(
  detail: string,
  observed: Pick<InvalidSample, 'report' | 'pid' | 'refreshRate' | 'timings'>,
  traceFile: string
): InvalidSample {
  return {
    valid: false,
    cause: 'crash',
    detail,
    trace: traceFile,
    ...observed,
  };
}

function inAppStateOf(state: AppState, refreshRate: number): InAppState {
  return { refreshRate, ...state };
}
