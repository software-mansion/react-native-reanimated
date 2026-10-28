import type { CoreId, Snapshot } from '@site/src/simulation';

export interface ConsoleEntry {
  core: CoreId;
  level: 'log' | 'error';
  text: string;
  tick: number;
}

export function collectConsoleEntries(
  snapshots: Snapshot[],
  tick: number
): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.tick > tick) break;
    for (const event of snapshot.events) {
      // Logs follow their executing line; errors appear on the failing tick.
      if (
        event.type === 'error' ||
        (event.type === 'log' && snapshot.tick < tick)
      ) {
        entries.push({
          core: event.core,
          level: event.type,
          text: event.type === 'error' ? event.message : event.text,
          tick: snapshot.tick,
        });
      }
    }
  }
  return entries;
}
