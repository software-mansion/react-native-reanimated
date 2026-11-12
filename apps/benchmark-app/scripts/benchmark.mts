#!/usr/bin/env node

import { USAGE, parseArguments } from './arguments.mts';
import { ToolError } from './errors.mts';
import { runCommand } from './run.mts';
import { sampleCommand } from './sample.mts';
import { Processes } from './tools.mts';
import type { CommandContext } from './tools.mts';

const TOOL_ERROR_EXIT_CODE = 2;

const processes = new Processes();
let cleanup: (() => Promise<void>) | null = null;
let interrupted = false;

process.on('SIGINT', () => void interrupt(130));
process.on('SIGTERM', () => void interrupt(143));

await main();

async function main() {
  const context: CommandContext = {
    processes,
    log,
    onInterrupt: (action) => {
      cleanup = action;
    },
  };
  try {
    const command = parseArguments(process.argv.slice(2));
    if (command.command === 'help') {
      console.log(USAGE);
      return;
    }
    process.exitCode =
      command.command === 'run'
        ? await runCommand(command, context)
        : await sampleCommand(command, context);
  } catch (error) {
    if (interrupted) {
      return;
    }
    log(
      error instanceof ToolError
        ? error.message
        : String((error as Error).stack ?? error)
    );
    process.exitCode = TOOL_ERROR_EXIT_CODE;
  }
}

async function interrupt(exitCode: number) {
  if (interrupted) {
    process.exit(exitCode);
  }
  interrupted = true;
  log(
    'interrupted: stop the apps and perfetto, and remove the traces on the device'
  );
  processes.stopAll();
  try {
    await cleanup?.();
  } catch (error) {
    log(`cleanup failed: ${(error as Error).message}`);
  }
  process.exit(exitCode);
}

function log(message: string) {
  console.error(`[benchmark] ${message}`);
}
