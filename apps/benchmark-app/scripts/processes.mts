import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { ToolError } from './errors.mts';

export interface ProcessOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  logFile?: string;
  timeoutMs?: number;
}

export interface ProcessOutput {
  stdout: string;
  stderr: string;
}

export interface LineStream {
  stop: () => void;
  failure: () => ToolError | null;
}

const PROCESS_TIMEOUT_MS = 60_000;

const STREAM_ERROR_LINES = 20;

export class Processes {
  readonly #running = new Set<ChildProcess>();

  run(
    command: string,
    args: string[],
    options: ProcessOptions = {}
  ): Promise<ProcessOutput> {
    const timeoutMs = options.timeoutMs ?? PROCESS_TIMEOUT_MS;
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
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buffered += chunk.toString();
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() ?? '';
      lines.forEach(onLine);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = tail(stderr + chunk.toString(), STREAM_ERROR_LINES);
    });
    child.on('error', (error) => {
      failure ??= new ToolError(
        `Cannot start ${commandLine(command, args)}: ${missingTool(command, error).message}`
      );
    });
    child.on('close', (code, signal) => {
      if (!stopped) {
        failure ??= new ToolError(
          `${commandLine(command, args)} stopped (${signal ?? `exit ${code}`}) before the driver stopped it${stderr.trim() ? `:\n${stderr.trim()}` : ''}`
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

  #spawn(
    command: string,
    args: string[],
    options: ProcessOptions
  ): ChildProcess {
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
