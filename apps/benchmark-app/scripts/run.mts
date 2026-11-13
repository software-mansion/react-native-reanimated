import path from 'node:path';

import type { ResumeOptions, RunOptions } from './arguments.mts';
import { blocksOf, validateNoiseLimits } from './config.mts';
import { evaluateExpectations, exitCodeOf } from './expectations.mts';
import {
  DEFAULT_DEPENDENCIES,
  readConfig,
  readJson,
  resumeMeasurement,
  startMeasurement,
} from './measurement.mts';
import type {
  MeasurementDependencies,
  MeasurementJob,
} from './measurement.mts';
import { takeSample } from './protocol.mts';
import type { SampleResult } from './protocol.mts';
import { renderReport } from './report.mts';
import {
  acceptedValues,
  readResult,
  scenariosWithoutData,
} from './results.mts';
import type { RunResult } from './results.mts';
import type { CommandContext } from './tools.mts';
import { computeVerdictRows } from './verdict.mts';

export async function runCommand(
  options: RunOptions,
  context: CommandContext,
  dependencies: MeasurementDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const config = readConfig(options.config);
  const noiseLimits = options.noiseLimits
    ? validateNoiseLimits(readJson(options.noiseLimits))
    : null;
  return startMeasurement(
    {
      config,
      serial: options.serial,
      traceProcessor: options.traceProcessor,
      folderName: config.name,
    },
    (fields) => ({
      ...fields,
      command: 'run',
      options: {
        blocks: options.blocks,
        noiseLimitsFile: options.noiseLimits ?? null,
        keepTraces: options.keepTraces,
      },
      noiseLimits,
      statistics: [],
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
  dependencies: MeasurementDependencies = DEFAULT_DEPENDENCIES
): Promise<number> {
  const folder = path.resolve(options.folder);
  return resumeMeasurement(
    folder,
    readResult(folder),
    options,
    runJob,
    context,
    dependencies
  );
}

function runJob(result: RunResult): MeasurementJob<SampleResult, RunResult> {
  return {
    scenarios: result.config.scenarios,
    blocksOf: (scenario) =>
      blocksOf(result.config, scenario, result.options.blocks),
    measure: takeSample,
    clearSummary: (stopped) => {
      stopped.statistics = [];
      stopped.expectations = [];
    },
    summarize,
    renderReport,
    exitCode: (done) => exitCodeOf(done.expectations),
  };
}

function summarize(result: RunResult) {
  const completed = result.scenarios.filter(
    (outcome) => outcome.failed === null
  );
  result.statistics = computeVerdictRows(
    completed.map((outcome) => outcome.scenario),
    (scenario, metric, variant) =>
      completed
        .filter((outcome) => outcome.scenario === scenario)
        .flatMap((outcome) => acceptedValues(outcome, metric, variant)),
    result.noiseLimits ?? {},
    result.config.scenarios.filter(
      (scenario) => !completed.some((outcome) => outcome.scenario === scenario)
    )
  );
  result.expectations = evaluateExpectations(
    result.config.expect,
    result.statistics,
    result.scenarios.flatMap((outcome) =>
      outcome.failed ? [outcome.failed] : []
    ),
    scenariosWithoutData(result)
  );
}
