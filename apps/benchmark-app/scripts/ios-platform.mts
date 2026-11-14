import { ToolError } from './errors.mts';
import { iosBuild } from './ios-build.mts';
import {
  IosDevice,
  changedIosStateKeys,
  readIosToolVersions,
} from './ios-device.mts';
import type { IosDeviceState } from './ios-device.mts';
import { InAppStateGuard, launchOnce, takeIosSample } from './ios-protocol.mts';
import type { IosSampleContext } from './ios-protocol.mts';
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
import { SYSTEM_CLOCK } from './protocol.mts';
import type { Clock, SampleResult } from './protocol.mts';
import type { Processes } from './tools.mts';
import { buildVariant } from './variant-build.mts';
import type { BuildRequest, BuiltVariant } from './variant-build.mts';
import { Xctrace } from './xctrace.mts';
import type { IosTracer } from './xctrace.mts';

export interface IosDependencies {
  buildVariant: typeof buildVariant;
  createDevice: (processes: Processes, udid: string) => IosDevice;
  createTracer: (processes: Processes) => IosTracer;
  clock: Clock;
}

export const DEFAULT_IOS_DEPENDENCIES: IosDependencies = {
  buildVariant,
  createDevice: (processes, udid) => new IosDevice(processes, udid),
  createTracer: (processes) => new Xctrace(processes),
  clock: SYSTEM_CLOCK,
};

export class IosSampling implements Sampling {
  readonly #device: IosDevice;
  readonly #start: IosDeviceState;
  readonly #context: IosSampleContext;

  constructor(
    device: IosDevice,
    tracer: IosTracer,
    clock: Clock,
    reference: SamplingReference,
    deviceName: string
  ) {
    this.#device = device;
    this.#start = iosState(reference.start);
    this.#context = {
      device,
      deviceName,
      tracer,
      clock,
      guard: new InAppStateGuard(reference.inAppState),
    };
  }

  async checkIdle(): Promise<IdleState> {
    const changes = changedIosStateKeys(
      this.#start,
      await this.#device.readState()
    );
    if (changes.length > 0) {
      throw new ToolError(
        `The device state changed (read before the cool-down): ${changes.join(', ')}`
      );
    }
    return {};
  }

  takeSample(order: SampleOrder): Promise<SampleResult> {
    return takeIosSample(order, this.#context);
  }
}

export function iosPlatform(
  dependencies: IosDependencies = DEFAULT_IOS_DEPENDENCIES
): Platform<IosSampling> {
  return {
    name: 'ios',
    traceExtension: 'trace',
    connect: (processes, udid, options) =>
      connect(processes, udid, options, dependencies),
  };
}

async function connect(
  processes: Processes,
  udid: string,
  options: PlatformOptions,
  dependencies: IosDependencies
): Promise<PlatformSession<IosSampling>> {
  const device = dependencies.createDevice(processes, udid);
  const startState = await device.readState();
  return {
    startState,
    readToolVersions: () => readIosToolVersions(processes),
    buildVariant: (request) =>
      buildIosVariant(request, options.signCommand, dependencies),
    install: async (variant) => {
      await device.install(variant.artifact);
      await launchOnce(device, variant.applicationId, dependencies.clock);
    },
    checkInstalled: (applicationId) => device.checkInstalled(applicationId),
    cleanUp: (applicationIds, log) => cleanUp(device, applicationIds, log),
    stateChanges: (stored) => changedIosStateKeys(iosState(stored), startState),
    sampling: (reference) =>
      new IosSampling(
        device,
        dependencies.createTracer(processes),
        dependencies.clock,
        reference,
        startState.name
      ),
  };
}

async function buildIosVariant(
  request: BuildRequest,
  signCommand: string | undefined,
  dependencies: IosDependencies
): Promise<BuiltVariant> {
  if (signCommand === undefined) {
    throw new ToolError('An iOS build needs --sign-command.');
  }
  if (request.variant.profiling) {
    throw new ToolError(
      `Variant ${request.key}: "profiling": true is not supported on iOS.`
    );
  }
  return dependencies.buildVariant(request, iosBuild(signCommand));
}

async function cleanUp(
  device: IosDevice,
  applicationIds: readonly string[],
  log: (message: string) => void
) {
  for (const applicationId of applicationIds) {
    try {
      await device.terminate(applicationId);
    } catch (error) {
      log(`cleanup: cannot stop ${applicationId}: ${(error as Error).message}`);
    }
  }
}

function iosState(state: DeviceState): IosDeviceState {
  if (!('osBuild' in state)) {
    throw new ToolError('The stored device state is not of an iOS device');
  }
  return state;
}
