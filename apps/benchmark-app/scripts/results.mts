import fs from 'node:fs';
import path from 'node:path';

import type { DeviceState } from './android-device.mts';
import type { RunConfig, VariantKey } from './config.mts';
import { ToolError } from './errors.mts';
import type { ExpectationResult } from './expectations.mts';
import type { ScenarioOutcome } from './session.mts';
import type { ToolVersions } from './tools.mts';
import type { BuiltVariant } from './variant-build.mts';
import type { NoiseLimits, VerdictRow } from './verdict.mts';

export type RunStatus = 'running' | 'done' | 'interrupted' | 'tool error';

export interface RunResult {
  formatVersion: 1;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  config: RunConfig;
  options: {
    blocks: number;
    noiseLimitsFile: string | null;
    keepTraces: boolean;
  };
  noiseLimits: NoiseLimits | null;
  serial: string;
  device?: DeviceState;
  tools?: ToolVersions;
  variants: Partial<Record<VariantKey, BuiltVariant>>;
  scenarios: ScenarioOutcome[];
  statistics: VerdictRow[];
  expectations: ExpectationResult[];
}

export function runFolderName(date: Date, name: string): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${stamp}-${name}`;
}

export function createRunFolder(
  runsDir: string,
  date: Date,
  name: string
): string {
  const base = path.join(runsDir, runFolderName(date, name));
  let folder = base;
  for (let copy = 2; fs.existsSync(folder); copy++) {
    folder = `${base}-${copy}`;
  }
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

export function writeResult(folder: string, result: RunResult) {
  const file = path.join(folder, 'result.json');
  fs.writeFileSync(
    `${file}.partial`,
    `${JSON.stringify(result, rejectNonFinite, 2)}\n`
  );
  fs.renameSync(`${file}.partial`, file);
}

export function finiteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new ToolError(`${label} is ${value}, not a finite number`);
  }
  return value;
}

function rejectNonFinite(key: string, value: unknown): unknown {
  return typeof value === 'number'
    ? finiteNumber(value, `The result field "${key}"`)
    : value;
}
