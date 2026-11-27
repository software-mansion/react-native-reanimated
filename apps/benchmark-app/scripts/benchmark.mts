#!/usr/bin/env node

import { USAGE, parseArguments } from './arguments.mts';
import type { Command } from './arguments.mts';
import { TOOL_ERROR_EXIT_CODE } from './command-context.mts';
import type { CommandContext } from './command-context.mts';
import { crosscheckCommand } from './crosscheck-command.mts';
import { ToolError } from './errors.mts';
import { knownWorkCommand } from './known-work-command.mts';
import { memoryCommand, memoryResumeCommand } from './memory.mts';
import { noiseLimitsCommand } from './noise-limits.mts';
import { observerCostCommand } from './observer-cost-command.mts';
import { Processes } from './processes.mts';
import { resumeCommand, runCommand } from './run.mts';
import { sampleCommand } from './sample-command.mts';
import { validationRecordCommand } from './validation-record.mts';

const processes = new Processes();
let cleanup: ((exitCode: number) => Promise<void>) | null = null;
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
    process.exitCode = await runParsedCommand(
      parseArguments(process.argv.slice(2)),
      context
    );
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

async function runParsedCommand(
  command: Command,
  context: CommandContext
): Promise<number> {
  switch (command.command) {
    case 'help':
      console.log(USAGE);
      return 0;
    case 'run':
      return runCommand(command, context);
    case 'resume':
      return resumeCommand(command, context);
    case 'memory':
      return memoryCommand(command, context);
    case 'memory-resume':
      return memoryResumeCommand(command, context);
    case 'noise-limits':
      return noiseLimitsCommand(command);
    case 'sample':
      return sampleCommand(command, context);
    case 'crosscheck':
      return crosscheckCommand(command, context);
    case 'observer-cost':
      return observerCostCommand(command, context);
    case 'known-work':
      return knownWorkCommand(command, context);
    case 'validation-record':
      return validationRecordCommand(command);
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
    await cleanup?.(exitCode);
  } catch (error) {
    log(`cleanup failed: ${(error as Error).message}`);
  }
  process.exit(exitCode);
}

function log(message: string) {
  console.error(`[benchmark] ${message}`);
}
