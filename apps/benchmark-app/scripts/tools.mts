import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ToolError } from './errors.mts';

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  logFile?: string;
  timeoutMs?: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface LineStream {
  stop: () => void;
  failure: () => ToolError | null;
}

export interface CommandContext {
  processes: Processes;
  log: (message: string) => void;
  onInterrupt: (cleanup: () => Promise<void>) => void;
}

export interface ToolVersions {
  node: string;
  adb: string;
  traceProcessor: string;
  devicePerfetto: string;
}

export const COMMAND_TIMEOUT_MS = 60_000;

export class Processes {
  readonly #running = new Set<ChildProcess>();

  run(
    command: string,
    args: string[],
    options: RunOptions = {}
  ): Promise<CommandResult> {
    const timeoutMs = options.timeoutMs ?? COMMAND_TIMEOUT_MS;
    return new Promise((resolve, reject) => {
      const child = this.#spawn(command, args, options);
      const log = options.logFile
        ? fs.createWriteStream(options.logFile, { flags: 'a' })
        : null;
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
        log?.write(chunk);
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
        log?.write(chunk);
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        log?.end();
        reject(missingTool(command, error));
      });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        log?.end();
        if (timedOut) {
          reject(
            new ToolError(
              `${commandLine(command, args)} did not finish in ${timeoutMs / 1000} s`
            )
          );
        } else if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(
            new ToolError(
              `${commandLine(command, args)} failed (${signal ?? `exit ${code}`}):\n${tail(stderr || stdout, 20)}`
            )
          );
        }
      });
      if (options.input !== undefined) {
        child.stdin?.end(options.input);
      }
    });
  }

  streamLines(
    command: string,
    args: string[],
    onLine: (line: string) => void
  ): LineStream {
    const child = this.#spawn(command, args, {});
    let stopped = false;
    let failure: ToolError | null = null;
    let buffered = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buffered += chunk.toString();
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() ?? '';
      lines.forEach(onLine);
    });
    child.on('error', (error) => {
      failure ??= new ToolError(
        `Cannot start ${commandLine(command, args)}: ${missingTool(command, error).message}`
      );
    });
    child.on('close', (code, signal) => {
      if (!stopped) {
        failure ??= new ToolError(
          `${commandLine(command, args)} stopped (${signal ?? `exit ${code}`}) before the driver stopped it`
        );
      }
    });
    return {
      stop: () => {
        stopped = true;
        child.kill('SIGTERM');
      },
      failure: () => failure,
    };
  }

  stopAll() {
    for (const child of this.#running) {
      child.kill('SIGTERM');
    }
  }

  #spawn(command: string, args: string[], options: RunOptions): ChildProcess {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    this.#running.add(child);
    child.on('close', () => this.#running.delete(child));
    return child;
  }
}

export function once<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>
): (...args: Args) => Promise<void> {
  let running: Promise<void> | null = null;
  return (...args) => (running ??= action(...args));
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

export async function readToolVersions(
  processes: Processes,
  adb: string,
  traceProcessor: string,
  serial: string
): Promise<ToolVersions> {
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

function missingTool(command: string, error: NodeJS.ErrnoException): Error {
  return error.code === 'ENOENT'
    ? new ToolError(`${command} is not found`)
    : error;
}

function commandLine(command: string, args: string[]): string {
  return [path.basename(command), ...args].join(' ');
}

function tail(text: string, lines: number): string {
  return text.trimEnd().split('\n').slice(-lines).join('\n');
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
