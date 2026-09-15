import type { SimEvent, Snapshot } from './types';

export interface FormatOptions {
  verbose?: boolean;
}

export function formatTrace(
  snapshots: Snapshot[],
  options: FormatOptions = {}
): string[] {
  const verbose = options.verbose ?? false;
  const coreIds = allCoreIds(snapshots);
  return snapshots
    .filter((snapshot) => snapshot.tick > 0)
    .map((snapshot) => {
      const cores = coreIds
        .map((id) => {
          const core = snapshot.cores.find((candidate) => candidate.id === id);
          const line = core?.line ?? null;
          const name = columnName(id);
          return `${name}:${line === null ? '-' : `L${line}`}`.padEnd(
            name.length + 6
          );
        })
        .join('');
      const events = snapshot.events
        .filter((event) => verbose || isTraceEvent(event))
        .map(formatEvent)
        .join('; ');
      let line = `t${snapshot.tick}`.padEnd(4) + cores + '| ' + events;
      if (verbose) {
        line += '\n' + snapshot.cores.map(formatCoreState).join('\n');
      }
      return line;
    });
}

export function formatLogs(snapshots: Snapshot[]): string[] {
  return snapshots.flatMap((snapshot) =>
    snapshot.events
      .filter((event) => event.type === 'log')
      .map((event) => `[${event.core}] ${event.text}`)
  );
}

export function allCoreIds(snapshots: Snapshot[]): string[] {
  const ids: string[] = [];
  for (const snapshot of snapshots) {
    for (const core of snapshot.cores) {
      if (!ids.includes(core.id)) {
        ids.push(core.id);
      }
    }
  }
  return ids;
}

function columnName(id: string): string {
  return id.startsWith('worker:')
    ? id.slice('worker:'.length).toUpperCase()
    : id.toUpperCase();
}

function isTraceEvent(event: SimEvent): boolean {
  return (
    event.type === 'log' ||
    event.type === 'scheduled' ||
    event.type === 'runtimeCreated' ||
    event.type === 'screen' ||
    event.type === 'error'
  );
}

export function formatEvent(event: SimEvent): string {
  switch (event.type) {
    case 'jobStart':
      return `start(${event.core}) ${event.job}`;
    case 'exec':
      return `exec(${event.core}) ${event.text}`;
    case 'log':
      return `log(${event.core}) ${JSON.stringify(event.text)}`;
    case 'scheduled':
      return `schedule(${event.core}→${event.target}) ${event.job} via ${event.via}`;
    case 'runtimeCreated':
      return `create(${event.core}) runtime "${event.name}" as ${event.runtime}`;
    case 'screen':
      return `screen(${event.core}) ${JSON.stringify(event.state)}`;
    case 'delivered':
      return `deliver(${event.core}) [${event.jobs.join(', ')}]`;
    case 'jobEnd':
      return `end(${event.core}) ${event.job}`;
    case 'error':
      return `error(${event.core}) ${event.message}`;
  }
}

function formatCoreState(core: Snapshot['cores'][number]): string {
  const parts = [
    `status=${core.status}`,
    `job=${core.job ?? '-'}`,
    `stack=[${core.callStack.join(' > ')}]`,
    `microtasks=[${core.microtasks.join(', ')}]`,
    `queue=[${core.queue.join(', ')}]`,
  ];
  if (core.error !== null) {
    parts.push(`error=${core.error}`);
  }
  return `      ${core.id.toUpperCase()} ${parts.join(' ')}`;
}
