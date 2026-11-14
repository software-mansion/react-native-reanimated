import path from 'node:path';

import type { ResumeOptions, RunOptions } from './arguments.mts';
import type { CommandContext } from './command-context.mts';
import { blocksOf, readConfigFile, validateConfig } from './config.mts';
import { PLATFORM_DEFINITIONS } from './definitions.mts';
import { evaluateExpectations, exitCodeOf } from './expectations.mts';
import {
  dependenciesOf,
  resumeMeasurement,
  startMeasurement,
} from './measurement.mts';
import type {
  MeasurementDependencies,
  MeasurementJob,
} from './measurement.mts';
import {
  checkNoiseLimitsRecord,
  readNoiseLimitsRecord,
} from './noise-limits-record.mts';
import { expectationLine, renderReport } from './report.mts';
import {
  acceptedValues,
  readResult,
  scenariosWithoutData,
} from './results.mts';
import type { RunResult } from './results.mts';
import type { SampleResult } from './samples.mts';
import { balancedOrder } from './session.mts';
import { countBy } from './summary.mts';
import type { MeasurementOutcome } from './summary.mts';
import { computeComparisonRows } from './verdict.mts';

export async function runCommand(
  options: RunOptions,
  context: CommandContext,
  dependencies: MeasurementDependencies = dependenciesOf(options.device)
): Promise<number> {
  const definition = PLATFORM_DEFINITIONS[options.device.platform];
  const config = readConfigFile(options.config, (raw, configDir, fileSystem) =>
    validateConfig(raw, configDir, fileSystem, definition)
  );
  const noiseLimits = options.noiseLimits
    ? readNoiseLimitsRecord(options.noiseLimits)
    : null;
  return startMeasurement(
    {
      config,
      device: options.device,
      platformOptions: {
        traceProcessor: options.traceProcessor,
        signCommand: options.signCommand,
      },
      outputDir: options.outputDir,
      folderName: config.name,
      checkDevice: (identity) => {
        if (noiseLimits) {
          checkNoiseLimitsRecord(noiseLimits, definition.name, identity);
        }
      },
    },
    (fields) => ({
      ...fields,
      command: 'run',
      config,
      options: {
        blocks: options.blocks,
        noiseLimitsFile: options.noiseLimits ?? null,
        keepTraces: options.keepTraces,
      },
      noiseLimits,
      verdictRows: [],
      advisoryRows: [],
      expectations: [],
    }),
    runJob,
    context,
    dependencies
  );
}

export async function resumeCommand(
  options: ResumeOptions,
  context: CommandContext,
  dependencies: MeasurementDependencies = dependenciesOf(options.device)
): Promise<number> {
  const folder = path.resolve(options.folder);
  return resumeMeasurement(
    folder,
    readResult(folder),
    {
      device: options.device,
      platformOptions: { traceProcessor: options.traceProcessor },
    },
    runJob,
    context,
    dependencies
  );
}

function runJob(result: RunResult): MeasurementJob<SampleResult, RunResult> {
  return {
    scenarios: result.config.scenarios,
    comparesBatteryLevel: true,
    unitName: 'block',
    orderOf: balancedOrder,
    roundsOf: (scenario) =>
      blocksOf(result.config, scenario, result.options.blocks),
    measure: (order, sampling) => sampling.takeSample(order),
    clearSummary: (stopped) => {
      stopped.verdictRows = [];
      stopped.advisoryRows = [];
      stopped.expectations = [];
    },
    summarize,
    renderReport,
    outcome: runOutcome,
  };
}

function summarize(result: RunResult) {
  const completed = result.scenarios.filter(
    (outcome) => outcome.failed === null
  );
  const { verdictRows, advisoryRows } = computeComparisonRows(
    PLATFORM_DEFINITIONS[result.platform],
    completed.map((outcome) => outcome.scenario),
    (scenario, metric, variant) =>
      completed
        .filter((outcome) => outcome.scenario === scenario)
        .flatMap((outcome) => acceptedValues(outcome, metric, variant)),
    result.noiseLimits?.limits ?? {},
    result.config.scenarios.filter(
      (scenario) => !completed.some((outcome) => outcome.scenario === scenario)
    )
  );
  result.verdictRows = verdictRows;
  result.advisoryRows = advisoryRows;
  result.expectations = evaluateExpectations(
    result.config.expect,
    verdictRows,
    result.scenarios.flatMap((outcome) =>
      outcome.failed ? [outcome.failed] : []
    ),
    scenariosWithoutData(result, result.config.scenarios)
  );
}

function runOutcome(result: RunResult): MeasurementOutcome {
  const exitCode = exitCodeOf(result.expectations);
  const failed = result.expectations
    .map((expectation, i) => ({ expectation, i }))
    .filter(({ expectation }) => expectation.status !== 'holds');
  return {
    exitCode,
    reason:
      failed.length === 0
        ? `All ${result.expectations.length} expectations hold.`
        : `${failed.length} of ${result.expectations.length} expectations do not hold.`,
    failedExpectations: failed.map(({ expectation, i }) => ({
      status: expectation.status,
      text: expectationLine(
        expectation,
        i,
        result.config,
        PLATFORM_DEFINITIONS[result.platform]
      ),
    })),
    verdictCounts: countBy(result.verdictRows, (row) => row.verdict),
  };
}
