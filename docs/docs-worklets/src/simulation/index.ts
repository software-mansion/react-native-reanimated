import { loadSnippet } from './loadSnippet';
import { DEFAULT_MAX_TICKS, Machine } from './machine';
import { APP_MS_PER_TICK } from './types';
import type { SimulateOptions, Snapshot, SnippetModule } from './types';

export { displaySource } from './display';
export { SnippetError } from './errors';
export { formatEvent, formatLogs, formatTrace } from './format';
export { loadSnippet } from './loadSnippet';
export { CORE_SPECS, Machine } from './machine';
export type * from './types';
export {
  APP_MS_PER_TICK,
  FRAME_MS,
  MIN_TICK_MS,
  TICKS_PER_FRAME,
} from './types';

export function simulate(
  module: SnippetModule,
  source: string,
  options: SimulateOptions = {}
): Snapshot[] {
  const maxTicks = Math.max(
    options.maxTicks ?? DEFAULT_MAX_TICKS,
    options.durationTicks ?? 0
  );
  const machine = new Machine(loadSnippet(module, source), options);
  machine.skip(options.skipTicks ?? 0);
  const snapshots = [machine.snapshot()];
  while (!machine.isFinished()) {
    if (
      options.durationTicks !== undefined &&
      snapshots.length > options.durationTicks
    ) {
      break;
    }
    if (snapshots.length > maxTicks) {
      throw new Error(`Simulation did not finish within ${maxTicks} ticks`);
    }
    snapshots.push(machine.tick(snapshots.length * APP_MS_PER_TICK));
  }
  return snapshots;
}
