import type { Processes } from './processes.mts';

export interface CommandContext {
  processes: Processes;
  log: (message: string) => void;
  onInterrupt: (cleanup: () => Promise<void>) => void;
}

export function once<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>
): (...args: Args) => Promise<void> {
  let running: Promise<void> | null = null;
  return (...args) => (running ??= action(...args));
}
