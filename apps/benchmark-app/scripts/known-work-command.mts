import fs from 'node:fs';
import path from 'node:path';

import type { KnownWorkOptions } from './arguments.mts';
import { SYSTEM_CLOCK } from './clock.mts';
import type { Clock } from './clock.mts';
import { once } from './command-context.mts';
import type { CommandContext } from './command-context.mts';
import { ToolError } from './errors.mts';
import type { InAppSample } from './in-app-sample.mts';
import { IOS_DEFINITION } from './ios-definition.mts';
import { IosDevice, readIosToolVersions } from './ios-device.mts';
import { iosPlatform } from './ios-platform.mts';
import {
  InAppStateGuard,
  inAppStatesOf,
  startIosApp,
} from './ios-protocol.mts';
import type { RunningIosApp } from './ios-protocol.mts';
import {
  KNOWN_WORK_INSTRUCTIONS_PER_UNIT,
  KNOWN_WORK_PLAN,
  KNOWN_WORK_SCENARIO,
  KNOWN_WORK_TOLERANCE,
  deriveKnownWork,
} from './known-work.mts';
import type { KnownWorkDerivation } from './known-work.mts';
import type { Processes } from './processes.mts';
import { createMeasurementFolder } from './results.mts';
import { timedSteps } from './samples.mts';
import {
  VALIDATION_SOURCE_FORMAT_VERSION,
  writeKnownWorkResult,
} from './validation-sources.mts';
import type { KnownWorkResult } from './validation-sources.mts';

export interface KnownWorkDependencies {
  createDevice: (processes: Processes, udid: string) => IosDevice;
  clock: Clock;
}

const DEFAULT_DEPENDENCIES: KnownWorkDependencies = {
  createDevice: (processes, udid) => new IosDevice(processes, udid),
  clock: SYSTEM_CLOCK,
};

const REPORT_FILE = 'known-work.md';

export async function knownWorkCommand(
  options: KnownWorkOptions,
  context: CommandContext,
  dependencies: KnownWorkDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const { processes, log } = context;
  const device = dependencies.createDevice(processes, options.device.id);
  const state = await device.readState();
  await device.checkInstalled(options.applicationId);
  const tools = await readIosToolVersions(processes);
  const identity = iosPlatform().deviceIdentity(state);
  context.onInterrupt(once(() => device.terminate(options.applicationId)));

  const folder = createMeasurementFolder(
    options.outputDir,
    new Date(),
    'known-work'
  );
  log(`known-work ${options.applicationId} in ${folder}`);
  const { app, sample } = await takeKnownWorkSample(
    options,
    device,
    dependencies.clock
  );
  const derivation = deriveKnownWork({
    cpuCount: sample.cpuCount,
    reportedThermalState: sample.maxThermal,
    appBoundaries: sample.boundaries,
    epochs: sample.epochs,
  });
  const result: KnownWorkResult = {
    formatVersion: VALIDATION_SOURCE_FORMAT_VERSION,
    measurementRevision: IOS_DEFINITION.measurementRevision,
    platform: 'ios',
    device: identity,
    appBuild: app.launch.appBuild,
    applicationId: options.applicationId,
    scenario: KNOWN_WORK_SCENARIO,
    report: { version: app.report.version, load: app.report.load },
    tools,
    plan: KNOWN_WORK_PLAN,
    cpuCount: sample.cpuCount,
    reportedThermalState: sample.maxThermal,
    appBoundaries: sample.boundaries,
    sampledEpochs: sample.epochs,
    instructionsPerUnit: KNOWN_WORK_INSTRUCTIONS_PER_UNIT,
    tolerance: KNOWN_WORK_TOLERANCE,
    ...derivation,
  };
  writeKnownWorkResult(folder, result);
  fs.writeFileSync(path.join(folder, REPORT_FILE), knownWorkReport(derivation));
  log(`report ${path.join(folder, REPORT_FILE)}`);
  return derivation.thermalState === 0 &&
    derivation.gates.every((gate) => gate.passes)
    ? 0
    : 1;
}

async function takeKnownWorkSample(
  options: KnownWorkOptions,
  device: IosDevice,
  clock: Clock
): Promise<{ app: RunningIosApp; sample: InAppSample }> {
  const context = { device, clock, guard: new InAppStateGuard(null) };
  const start = await startIosApp(
    {
      applicationId: options.applicationId,
      stopApplicationIds: [options.applicationId],
      scenario: KNOWN_WORK_SCENARIO,
      plan: KNOWN_WORK_PLAN,
    },
    context,
    timedSteps(clock)
  );
  if (!start.started) {
    throw new ToolError(`The app did not reach READY: ${start.detail}`);
  }
  const { app } = start;
  const receipt = await app.waitForSample().finally(() => app.close());
  if (!receipt.received) {
    throw new ToolError(`The app gave no SAMPLE line: ${receipt.detail}`);
  }
  inAppStatesOf(receipt.sample, app.launch.refreshRate).forEach((state) =>
    context.guard.check(state)
  );
  return { app, sample: receipt.sample };
}

function knownWorkReport(derivation: KnownWorkDerivation): string {
  const number = (value: number | null, digits: number) =>
    value === null ? '-' : value.toFixed(digits);
  return `${[
    '# Known-work test of the instruction counter',
    '',
    `Thermal state: ${derivation.thermalState === 0 ? 'Nominal' : `above Nominal (${derivation.thermalState})`}. The instructions of a load are the instructions of its epoch minus the mean instruction rate of the idle epochs before and after it, times the length of the epoch.`,
    '',
    '| Epoch | Load | Units | Seconds | Instructions | Load instructions | Instructions (10^9/s) | Clock rate (GHz) | Performance-core share |',
    `|${' --- |'.repeat(9)}`,
    ...derivation.epochs.map(
      (epoch) =>
        `| ${[
          epoch.index,
          epoch.load,
          `${epoch.units}/${epoch.plannedUnits}`,
          epoch.seconds.toFixed(3),
          epoch.instructions,
          number(epoch.loadInstructions, 0),
          epoch.processInstructionRate.toFixed(4),
          number(epoch.processClockRate, 3),
          number(epoch.performanceCoreShare, 3),
        ].join(' | ')} |`
    ),
    '',
    '| Gate | Measured | Expected | Tolerance | Outcome |',
    `|${' --- |'.repeat(5)}`,
    ...derivation.gates.map(
      (gate) =>
        `| ${[
          gate.name,
          number(gate.measured, 4),
          gate.expected,
          `${(gate.tolerance * 100).toFixed(1)}%`,
          gate.passes ? 'passed' : 'failed',
        ].join(' | ')} |`
    ),
  ].join('\n')}\n`;
}
