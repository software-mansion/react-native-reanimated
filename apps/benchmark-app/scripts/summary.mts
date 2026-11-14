import fs from 'node:fs';
import path from 'node:path';

import { REPORT_FILE, RESULT_FILE, SUMMARY_FILE } from './paths.mts';
import type { MeasurementStatus, ResultCommand } from './results.mts';

export interface MeasurementOutcome {
  exitCode: number;
  reason: string;
  failedExpectations: FailedExpectation[];
  verdictCounts: Record<string, number>;
}

export interface FailedExpectation {
  status: string;
  text: string;
}

export interface MeasurementSummary extends MeasurementOutcome {
  formatVersion: typeof SUMMARY_FORMAT_VERSION;
  command: ResultCommand;
  status: MeasurementStatus;
  report: string;
  result: string;
}

const SUMMARY_FORMAT_VERSION = 1;

export function writeSummary(
  folder: string,
  command: ResultCommand,
  status: MeasurementStatus,
  outcome: MeasurementOutcome
) {
  const summary: MeasurementSummary = {
    formatVersion: SUMMARY_FORMAT_VERSION,
    command,
    status,
    ...outcome,
    report: REPORT_FILE,
    result: RESULT_FILE,
  };
  fs.writeFileSync(
    path.join(folder, SUMMARY_FILE),
    `${JSON.stringify(summary, null, 2)}\n`
  );
}

export function countBy<T>(
  items: readonly T[],
  keyOf: (item: T) => string
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
