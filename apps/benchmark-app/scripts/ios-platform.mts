import fs from 'node:fs';
import path from 'node:path';

import { ToolError } from './errors.mts';
import { IOS_BUILD, signApp } from './ios-build.mts';
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
    deviceIdentity: (state) => {
      const ios = iosState(state);
      return {
        model: `${ios.model} (${ios.productType})`,
        deviceId: ios.hardwareSerial,
        osBuild: ios.osBuild,
      };
    },
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
    buildVariant: (request) => buildIosVariant(request, dependencies),
    prepareInstallFile: (variant, folder) =>
      signVariant(processes, options.signCommand, variant, folder),
    install: async (installFile, applicationId) => {
      await device.install(installFile);
      await launchOnce(device, applicationId, dependencies.clock);
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
  dependencies: IosDependencies
): Promise<BuiltVariant> {
  if (request.variant.profiling) {
    throw new ToolError(
      `Variant ${request.key}: "profiling": true is not supported on iOS.`
    );
  }
  return dependencies.buildVariant(request, IOS_BUILD);
}

async function signVariant(
  processes: Processes,
  signCommand: string | undefined,
  variant: BuiltVariant,
  folder: string
): Promise<string> {
  if (signCommand === undefined) {
    throw new ToolError('An iOS run needs --sign-command.');
  }
  if (!fs.existsSync(signCommand)) {
    throw new ToolError(`The sign command ${signCommand} does not exist.`);
  }
  const signedDir = path.join(folder, 'signed');
  fs.mkdirSync(signedDir, { recursive: true });
  const ipa = path.join(signedDir, `${variant.variant}.ipa`);
  await signApp(processes, signCommand, variant.artifact, ipa);
  if (!fs.existsSync(ipa)) {
    throw new ToolError(
      `The sign command ${signCommand} wrote no file at ${ipa}`
    );
  }
  return ipa;
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
