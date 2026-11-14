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
import { IOS_DEFINITION } from './ios-definition.mts';
import { IosDevice, readIosToolVersions } from './ios-device.mts';
import type { IosToolVersions } from './ios-device.mts';
import { iosPlatform } from './ios-platform.mts';
import {
  InAppStateGuard,
  inAppStatesOf,
  startIosApp,
} from './ios-protocol.mts';
import type { IosSampleContext, RunningIosApp } from './ios-protocol.mts';
import {
  MEASUREMENT_REVISION,
  RECORDING_SECONDS,
} from './measurement-rules.mts';
import {
  checkNoiseLimitsRecord,
  checkScenarioIdentity,
  readNoiseLimitsRecord,
} from './noise-limits-record.mts';
import type { NoiseLimitsRecord } from './noise-limits-record.mts';
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
import type { Processes } from './processes.mts';
import { createMeasurementFolder } from './results.mts';
import { timedSteps } from './samples.mts';
import {
  VALIDATION_SOURCE_FORMAT_VERSION,
  writeObserverCostResult,
} from './validation-sources.mts';
import type { ObserverCostResult } from './validation-sources.mts';

export interface ObserverCostDependencies {
  createDevice: (processes: Processes, udid: string) => IosDevice;
  clock: Clock;
}

interface TakenSample {
  sample: Omit<CollectorSample, 'block'>;
  app: RunningIosApp;
}

const DEFAULT_DEPENDENCIES: ObserverCostDependencies = {
  createDevice: (processes, udid) => new IosDevice(processes, udid),
  clock: SYSTEM_CLOCK,
};

const MAXIMUM_ATTEMPTS = 3;

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
  const identity = iosPlatform().deviceIdentity(state);
  const record = options.noiseLimits
    ? readNoiseLimitsRecord(options.noiseLimits)
    : null;
  if (record) {
    checkNoiseLimitsRecord(record, 'ios', identity);
  }
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
  let launched: RunningIosApp | null = null;
  const write = (costs: ObserverCost[] | null) =>
    writeObserverCostResult(
      folder,
      resultOf(options, identity, tools, launched, samples, costs)
    );
  for (let block = 1; block <= options.blocks; block++) {
    for (const collector of BLOCK_ORDER) {
      const taken = await takeCollectorSample(
        options,
        collector,
        sampleContext,
        log
      );
      if (record) {
        checkScenarioIdentity(record, options.scenario, taken.app.report);
      }
      launched ??= taken.app;
      samples.push({ block, ...taken.sample });
      log(
        `block ${block} ${collector}: ${OBSERVER_COST_METRICS.map((metric) => `${metric} ${taken.sample[metric].toFixed(3)}`).join(', ')}`
      );
      write(null);
    }
  }
  const costs = observerCosts(samples, scenarioLimits(record, options));
  write(costs);
  fs.writeFileSync(path.join(folder, REPORT_FILE), observerCostReport(costs));
  log(`report ${path.join(folder, REPORT_FILE)}`);
  return costs
    .filter((cost) =>
      (IOS_DEFINITION.verdictMetrics as readonly string[]).includes(cost.metric)
    )
    .every((cost) => cost.outcome === 'passed')
    ? 0
    : 1;
}

function resultOf(
  options: ObserverCostOptions,
  identity: ObserverCostResult['device'],
  tools: IosToolVersions,
  launched: RunningIosApp | null,
  samples: CollectorSample[],
  costs: ObserverCost[] | null
): ObserverCostResult {
  return {
    formatVersion: VALIDATION_SOURCE_FORMAT_VERSION,
    measurementRevision: MEASUREMENT_REVISION,
    platform: 'ios',
    device: identity,
    appBuild: launched?.launch.appBuild ?? '',
    applicationId: options.applicationId,
    scenario: options.scenario,
    report: {
      version: launched?.report.version ?? 0,
      load: launched?.report.load ?? 0,
    },
    tools,
    blocks: options.blocks,
    noiseLimitsFile: options.noiseLimits ?? null,
    samples,
    costs,
  };
}

function scenarioLimits(
  record: NoiseLimitsRecord | null,
  options: ObserverCostOptions
): Partial<Record<ObserverCostMetric, number>> {
  return record?.limits[options.scenario] ?? {};
}

async function takeCollectorSample(
  options: ObserverCostOptions,
  collector: Collector,
  context: IosSampleContext,
  log: (message: string) => void
): Promise<TakenSample> {
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
      app,
      sample: {
        collector,
        ...reading.cpu,
        memory: reading.memory,
        windowSeconds: reading.window.seconds,
      },
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
        cost.outcome,
      ].join(' | ')} |`
  );
  return `${[
    '# Observer cost of the in-app collector',
    '',
    'Median of the samples with only the counter reads (endpoints) and with the full collector (full): ms/s for the CPU metrics, kB for `memory`. The interval is the 95% bootstrap interval of the relative difference of the medians; the bootstrap draws whole blocks. `passed`: the interval is inside the allowed band (one quarter of the noise limit). `failed`: the interval is fully outside it. `not validated`: the interval crosses a bound, the metric has no noise limit, or the test has fewer than 5 blocks.',
    '',
    '| Metric | Endpoints | Full | Difference | Interval | Noise limit | Allowed | Outcome |',
    `|${' --- |'.repeat(8)}`,
    ...rows,
  ].join('\n')}\n`;
}
