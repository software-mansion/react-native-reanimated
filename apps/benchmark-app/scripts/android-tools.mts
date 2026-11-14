import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ToolError } from './errors.mts';
import type { Processes } from './processes.mts';

export interface AndroidToolVersions {
  node: string;
  adb: string;
  traceProcessor: string;
  devicePerfetto: string;
}

export function resolveAndroidHome(
  env: NodeJS.ProcessEnv = process.env
): string {
  return (
    findAndroidHome(env) ??
    fail(
      `ANDROID_HOME is not set and no Android SDK is at ${defaultAndroidHome()}. Set ANDROID_HOME to the Android SDK folder.`
    )
  );
}

export function resolveAdb(env: NodeJS.ProcessEnv = process.env): string {
  const sdk = findAndroidHome(env);
  const candidate = sdk ? path.join(sdk, 'platform-tools', 'adb') : null;
  if (candidate && fs.existsSync(candidate)) {
    return candidate;
  }
  return (
    findOnPath('adb', env) ??
    fail(
      'adb is not in the Android SDK platform-tools folder or on PATH. Install the Android SDK platform tools.'
    )
  );
}

export function resolveTraceProcessor(
  option: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): string {
  const configured = option ?? env.TRACE_PROCESSOR_SHELL;
  if (configured) {
    return fs.existsSync(configured)
      ? path.resolve(configured)
      : fail(`trace_processor_shell is not at ${configured}`);
  }
  return (
    findOnPath('trace_processor_shell', env) ??
    fail(
      'trace_processor_shell is not found. Give --trace-processor <path>, set TRACE_PROCESSOR_SHELL, or put it on PATH.'
    )
  );
}

const ADB_VERSION_LINES = 2;

export async function readAndroidToolVersions(
  processes: Processes,
  adb: string,
  traceProcessor: string,
  serial: string
): Promise<AndroidToolVersions> {
  const firstLines = async (command: string, args: string[], count: number) =>
    (await processes.run(command, args)).stdout
      .trim()
      .split('\n')
      .slice(0, count)
      .join(', ');
  const firstLine = (command: string, args: string[]) =>
    firstLines(command, args, 1);
  return {
    node: process.version,
    adb: await firstLines(adb, ['version'], ADB_VERSION_LINES),
    traceProcessor: await firstLine(traceProcessor, ['--version']),
    devicePerfetto: await firstLine(adb, [
      '-s',
      serial,
      'shell',
      'perfetto',
      '--version',
    ]),
  };
}

function findAndroidHome(env: NodeJS.ProcessEnv): string | null {
  const configured = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
  if (configured) {
    return configured;
  }
  return fs.existsSync(defaultAndroidHome()) ? defaultAndroidHome() : null;
}

function defaultAndroidHome(): string {
  return process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Android', 'sdk')
    : path.join(os.homedir(), 'Android', 'Sdk');
}

function fail(message: string): never {
  throw new ToolError(message);
}

function findOnPath(name: string, env: NodeJS.ProcessEnv): string | null {
  for (const dir of (env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(dir, name);
    if (dir && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
