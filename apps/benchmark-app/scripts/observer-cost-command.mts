import fs from 'node:fs';
import path from 'node:path';

import type { ObserverCostOptions } from './arguments.mts';
import { SYSTEM_CLOCK } from './clock.mts';
import type { Clock } from './clock.mts';
import { once } from './command-context.mts';
import type { CommandContext } from './command-context.mts';
import { ToolError } from './errors.mts';
import { highestThermalState, readEpoch } from './in-app-sample.mts';
import type { Collector } from './in-app-sample.mts';
import { IosDevice, readIosToolVersions } from './ios-device.mts';
import { iosPlatform } from './ios-platform.mts';
import {
  InAppStateGuard,
  inAppStatesOf,
  startIosApp,
} from './ios-protocol.mts';
import type { IosSampleContext } from './ios-protocol.mts';
import {
  MEASUREMENT_REVISION,
  RECORDING_SECONDS,
} from './measurement-rules.mts';
import {
  checkNoiseLimitsRecord,
  readNoiseLimitsRecord,
} from './noise-limits-record.mts';
import {
  BLOCK_ORDER,
  OBSERVER_COST_METRICS,
  observerCosts,
} from './observer-cost.mts';
import type {
  CollectorSample,
  ObserverCost,
  ObserverCostMetric,
} from './observer-cost.mts';
import type { DeviceIdentity } from './platform.mts';
import type { Processes } from './processes.mts';
import { createMeasurementFolder } from './results.mts';
import { timedSteps } from './samples.mts';

export interface ObserverCostDependencies {
  createDevice: (processes: Processes, udid: string) => IosDevice;
  clock: Clock;
}

const DEFAULT_DEPENDENCIES: ObserverCostDependencies = {
  createDevice: (processes, udid) => new IosDevice(processes, udid),
  clock: SYSTEM_CLOCK,
};

const MAXIMUM_ATTEMPTS = 3;

const RESULT_FILE = 'observer-cost.json';

const REPORT_FILE = 'observer-cost.md';

export async function observerCostCommand(
  options: ObserverCostOptions,
  context: CommandContext,
  dependencies: ObserverCostDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const { processes, log } = context;
  const device = dependencies.createDevice(processes, options.device.id);
  const state = await device.readState();
  await device.checkInstalled(options.applicationId);
  const tools = await readIosToolVersions(processes);
  const noiseLimits = readScenarioLimits(
    options,
    iosPlatform().deviceIdentity(state)
  );
  context.onInterrupt(once(() => device.terminate(options.applicationId)));

  const folder = createMeasurementFolder(
    options.outputDir,
    new Date(),
    `observer-cost-${options.scenario}`
  );
  const sampleContext: IosSampleContext = {
    device,
    clock: dependencies.clock,
    guard: new InAppStateGuard(null),
  };
  const samples: CollectorSample[] = [];
  const write = (costs: ObserverCost[] | null) =>
    fs.writeFileSync(
      path.join(folder, RESULT_FILE),
      `${JSON.stringify(
        {
          measurementRevision: MEASUREMENT_REVISION,
          applicationId: options.applicationId,
          scenario: options.scenario,
          device: state,
          tools,
          noiseLimitsFile: options.noiseLimits ?? null,
          samples,
          costs,
        },
        null,
        2
      )}\n`
    );
  for (let block = 1; block <= options.blocks; block++) {
    for (const collector of BLOCK_ORDER) {
      const sample = await takeCollectorSample(
        options,
        collector,
        sampleContext,
        log
      );
      samples.push({ block, ...sample });
      log(
        `block ${block} ${collector}: ${OBSERVER_COST_METRICS.map((metric) => `${metric} ${sample[metric].toFixed(3)}`).join(', ')} ms/s`
      );
      write(null);
    }
  }
  const costs = observerCosts(samples, noiseLimits);
  write(costs);
  fs.writeFileSync(path.join(folder, REPORT_FILE), observerCostReport(costs));
  log(`report ${path.join(folder, REPORT_FILE)}`);
  return costs.every((cost) => cost.within !== false) ? 0 : 1;
}

function readScenarioLimits(
  options: ObserverCostOptions,
  identity: DeviceIdentity
): Partial<Record<ObserverCostMetric, number>> {
  if (options.noiseLimits === undefined) {
    return {};
  }
  const record = readNoiseLimitsRecord(options.noiseLimits);
  checkNoiseLimitsRecord(record, 'ios', identity);
  return record.limits[options.scenario] ?? {};
}

async function takeCollectorSample(
  options: ObserverCostOptions,
  collector: Collector,
  context: IosSampleContext,
  log: (message: string) => void
): Promise<Omit<CollectorSample, 'block'>> {
  for (let attempt = 1; attempt <= MAXIMUM_ATTEMPTS; attempt++) {
    const start = await startIosApp(
      {
        applicationId: options.applicationId,
        stopApplicationIds: [options.applicationId],
        scenario: options.scenario,
        load: options.load,
        plan: {
          epochs: [{ load: 'none', collector, seconds: RECORDING_SECONDS }],
          start: 'ready',
        },
      },
      context,
      timedSteps(context.clock)
    );
    if (!start.started) {
      throw new ToolError(`The app did not reach READY: ${start.detail}`);
    }
    const { app } = start;
    const receipt = await app.waitForSample().finally(() => app.close());
    if (!receipt.received) {
      throw new ToolError(`The app gave no SAMPLE line: ${receipt.detail}`);
    }
    const { sample } = receipt;
    const { refreshRate } = app.launch;
    inAppStatesOf(sample, refreshRate).forEach((state) =>
      context.guard.check(state)
    );
    if (highestThermalState(sample) > 0) {
      log(
        `attempt ${attempt}: thermal state above Nominal, the sample is taken again`
      );
      continue;
    }
    const reading = readEpoch(sample, 0, refreshRate);
    return {
      collector,
      ...reading.cpu,
      windowSeconds: reading.window.seconds,
    };
  }
  throw new ToolError(
    `The thermal state was above Nominal in ${MAXIMUM_ATTEMPTS} attempts of one sample`
  );
}

function observerCostReport(costs: readonly ObserverCost[]): string {
  const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const rows = costs.map(
    (cost) =>
      `| ${[
        cost.metric,
        cost.medianEndpoints.toFixed(3),
        cost.medianFull.toFixed(3),
        percent(cost.relativeDifference),
        `${percent(cost.interval.low)} to ${percent(cost.interval.high)}`,
        cost.noiseLimit === null ? '-' : percent(cost.noiseLimit),
        cost.allowed === null ? '-' : `±${percent(cost.allowed)}`,
        cost.within === null ? 'no limit' : cost.within ? 'yes' : 'no',
      ].join(' | ')} |`
  );
  return `${[
    '# Observer cost of the in-app collector',
    '',
    'Median of the samples with only the counter reads (endpoints) and with the full collector (full), in ms/s. The interval is the 95% bootstrap interval of the relative difference of the medians.',
    '',
    '| Metric | Endpoints | Full | Difference | Interval | Noise limit | Allowed | Within |',
    `|${' --- |'.repeat(8)}`,
    ...rows,
  ].join('\n')}\n`;
}
