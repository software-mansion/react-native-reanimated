import { androidBuild } from './android-build.mts';
import {
  AndroidDevice,
  COMPARED_STATE_KEYS,
  DeviceStateGuard,
  STATE_KEYS_WITHOUT_BATTERY_LEVEL,
  changedStateKeys,
  checkAbi,
  checkSdk,
  cleanUpDevice,
  idleKeysOf,
} from './android-device.mts';
import type { DeviceState as AndroidDeviceState } from './android-device.mts';
import { takeSample, traceFileOf } from './android-protocol.mts';
import type { Collector, SampleRequest } from './android-protocol.mts';
import {
  readAndroidToolVersions,
  resolveAdb,
  resolveAndroidHome,
  resolveTraceProcessor,
} from './android-tools.mts';
import { SYSTEM_CLOCK } from './clock.mts';
import type { Clock } from './clock.mts';
import { ToolError } from './errors.mts';
import { TraceProcessor } from './perfetto.mts';
import type {
  DeviceState,
  IdleState,
  Platform,
  PlatformOptions,
  PlatformSession,
  SampleOrder,
  Sampling,
  SamplingReference,
} from './platform.mts';
import type { Processes } from './processes.mts';
import type { SampleResult } from './samples.mts';
import { buildVariant } from './variant-build.mts';

export interface AndroidDependencies {
  buildVariant: typeof buildVariant;
  createDevice: (
    processes: Processes,
    adb: string,
    serial: string
  ) => AndroidDevice;
  createCollector: (processes: Processes, traceProcessor: string) => Collector;
  clock: Clock;
}

const DEFAULT_ANDROID_DEPENDENCIES: AndroidDependencies = {
  buildVariant,
  createDevice: (processes, adb, serial) =>
    new AndroidDevice(processes, adb, serial),
  createCollector: (processes, traceProcessor) =>
    new TraceProcessor(processes, traceProcessor),
  clock: SYSTEM_CLOCK,
};

export class AndroidSampling implements Sampling {
  readonly device: AndroidDevice;
  readonly collector: Collector;
  readonly clock: Clock;
  readonly #guard: DeviceStateGuard;
  readonly #baselineTemperature: number;

  constructor(
    device: AndroidDevice,
    collector: Collector,
    clock: Clock,
    reference: SamplingReference
  ) {
    const start = androidState(reference.start);
    this.device = device;
    this.collector = collector;
    this.clock = clock;
    this.#guard = new DeviceStateGuard(
      start,
      reference.appRefreshRate,
      comparedKeys(reference.comparesBatteryLevel)
    );
    this.#baselineTemperature = start.batteryTemperature;
  }

  async checkIdle(): Promise<IdleState> {
    const state = await this.device.readState();
    this.#guard.checkIdle(state);
    return { batteryLevel: state.batteryLevel };
  }

  takeSample(order: SampleOrder): Promise<SampleResult> {
    return takeSample(
      this.request(order),
      this.device,
      this.collector,
      this.clock
    );
  }

  request({ outputDir, sampleName, ...order }: SampleOrder): SampleRequest {
    return {
      ...order,
      traceFile: traceFileOf(outputDir, sampleName),
      baselineTemperature: this.#baselineTemperature,
      guard: this.#guard,
    };
  }
}

export function androidPlatform(
  dependencies: AndroidDependencies = DEFAULT_ANDROID_DEPENDENCIES
): Platform<AndroidSampling> {
  return {
    name: 'android',
    deviceIdentity: (state) => {
      const android = androidState(state);
      return {
        model: android.model,
        deviceId: android.deviceId,
        osBuild: android.fingerprint,
      };
    },
    connect: (processes, serial, options) =>
      connect(processes, serial, options, dependencies),
  };
}

function androidState(state: DeviceState): AndroidDeviceState {
  if (!('sdk' in state)) {
    throw new ToolError('The stored device state is not of an Android device');
  }
  return state;
}

function comparedKeys(
  comparesBatteryLevel: boolean
): readonly (keyof AndroidDeviceState)[] {
  return comparesBatteryLevel
    ? COMPARED_STATE_KEYS
    : STATE_KEYS_WITHOUT_BATTERY_LEVEL;
}

async function connect(
  processes: Processes,
  serial: string,
  options: PlatformOptions,
  dependencies: AndroidDependencies
): Promise<PlatformSession<AndroidSampling>> {
  const androidHome = resolveAndroidHome();
  const adb = resolveAdb({ ...process.env, ANDROID_HOME: androidHome });
  const traceProcessor = resolveTraceProcessor(options.traceProcessor);
  const device = dependencies.createDevice(processes, adb, serial);
  await device.checkConnected();
  const startState = await device.readState();
  checkSdk(startState);
  checkAbi(startState);
  return {
    startState,
    readToolVersions: () =>
      readAndroidToolVersions(processes, adb, traceProcessor, serial),
    buildVariant: (request) =>
      dependencies.buildVariant(request, androidBuild(androidHome)),
    prepareInstallFile: async (variant) => variant.artifact,
    install: async (installFile, applicationId) => {
      await device.install(installFile);
      await device.compileForSpeed(applicationId);
    },
    checkInstalled: (applicationId) => device.checkInstalled(applicationId),
    cleanUp: (applicationIds, log) =>
      cleanUpDevice(device, applicationIds, log),
    stateChanges: (stored, comparesBatteryLevel) =>
      changedStateKeys(
        androidState(stored),
        startState,
        idleKeysOf(comparedKeys(comparesBatteryLevel))
      ),
    sampling: (reference) =>
      new AndroidSampling(
        device,
        dependencies.createCollector(processes, traceProcessor),
        dependencies.clock,
        reference
      ),
  };
}
