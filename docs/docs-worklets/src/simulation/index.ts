import { loadSnippet } from './loadSnippet';
import { DEFAULT_MAX_TICKS, Machine } from './machine';
import type { SimulateOptions, Snapshot, SnippetModule } from './types';

export { displaySource } from './display';
export { SnippetError } from './errors';
export { formatEvent, formatLogs, formatTrace } from './format';
export { loadSnippet } from './loadSnippet';
export { CORE_SPECS, Machine } from './machine';
export type * from './types';

export function simulate(
  module: SnippetModule,
  source: string,
  options: SimulateOptions = {}
): Snapshot[] {
  const maxTicks = options.maxTicks ?? DEFAULT_MAX_TICKS;
  const machine = new Machine(loadSnippet(module, source), options);
  machine.skip(options.skipTicks ?? 0);
  const snapshots = [machine.snapshot()];
  while (!machine.isFinished()) {
    if (snapshots.length > maxTicks) {
      throw new Error(`Simulation did not finish within ${maxTicks} ticks`);
    }
    snapshots.push(machine.tick());
  }
  return snapshots;
}
