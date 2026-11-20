import type { Processes } from './processes.mts';

export interface CommandContext {
  processes: Processes;
  log: (message: string) => void;
  onInterrupt: (cleanup: (exitCode: number) => Promise<void>) => void;
}

export const TOOL_ERROR_EXIT_CODE = 2;

export function once<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>
): (...args: Args) => Promise<void> {
  let running: Promise<void> | null = null;
  return (...args) => (running ??= action(...args));
}
