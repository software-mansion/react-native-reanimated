import fs from 'node:fs';
import path from 'node:path';

import type { TraceExports } from '../xctrace-metrics.mts';

// Cuts of the exports of xctrace 27.2 (27B52) of an iPhone 13 mini with iOS
// 27.0.1. The rows overlap 1855 ms to 1908 ms, and the cells that the reader
// does not read are sentinels. The Boundary signposts are not real: the tests
// add them in the format of the real State signposts of the same export. The
// Activity Monitor table is the empty table of xctrace 27.2 on a Mac, and the
// tests add its rows.
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'xctrace');

export const TRACE_EXPORTS: TraceExports = {
  threadState: fixture('thread-state-window.xml'),
  frames: fixture('hitches-updates.xml'),
  signposts: fixture('os-signpost-window.xml'),
  processes: fixture('activity-monitor-process-live.xml'),
};

export function withRows(xml: string, rows: string[]): string {
  return xml.replace('</node>', `${rows.join('\n')}\n</node>`);
}

export function withoutRows(xml: string): string {
  return xml.replace(/<row>[\s\S]*<\/row>\n/, '');
}

export function traceRowsOf(appPid: number) {
  const threadRow = (row: {
    start: number;
    thread: number;
    state: string;
    duration?: number;
    pid?: number;
  }): string => {
    const pid = row.pid ?? appPid;
    return `<row><start-time>${row.start}</start-time><thread><tid>${row.thread}</tid>${processCell(pid)}</thread><thread-state>${row.state}</thread-state><duration>${row.duration ?? 1}</duration>${processCell(pid)}${sentinels(11)}</row>`;
  };

  const intervalRow = (start: number, duration: number, pid = appPid) =>
    `<row><start-time>${start}</start-time><duration>${duration}</duration>${processCell(pid)}${sentinels(6)}</row>`;

  const signpostRow = (row: {
    time: number;
    name: string;
    subsystem: string;
    message: string;
    eventType?: string;
    pid?: number;
  }): string =>
    `<row><event-time>${row.time}</event-time>${sentinels(1)}${processCell(row.pid ?? appPid)}<event-type>${row.eventType ?? 'Event'}</event-type>${sentinels(2)}<signpost-name>${row.name}</signpost-name>${sentinels(2)}<subsystem>${row.subsystem}</subsystem>${sentinels(1)}<os-log-metadata>${row.message}</os-log-metadata>${sentinels(1)}</row>`;

  const boundaryRow = (time: number, index: number, pid = appPid) =>
    signpostRow({
      time,
      name: 'Boundary',
      subsystem: 'com.reanimatedbenchmark',
      message: `<narrative-text>index=</narrative-text><uint64>${index}</uint64>`,
      pid,
    });

  const mountRow = (time: number, pid = appPid) =>
    signpostRow({
      time,
      name: 'Systrace',
      subsystem: 'dev.reactnative.instruments',
      eventType: 'Begin',
      message:
        '<string>RCTPerformMountInstructions</string><narrative-text> begin: </narrative-text>',
      pid,
    });

  const footprintRow = (
    start: number,
    bytes: number,
    pid = appPid,
    duration = 1
  ) =>
    `<row><start-time>${start}</start-time>${processCell(pid)}${processCell(pid)}<duration>${duration}</duration><pid>${pid}</pid>${sentinels(5)}<size-in-bytes>${bytes}</size-in-bytes>${sentinels(16)}</row>`;

  return {
    threadRow,
    intervalRow,
    signpostRow,
    boundaryRow,
    mountRow,
    footprintRow,
  };
}

function fixture(file: string): string {
  return fs.readFileSync(path.join(FIXTURES, file), 'utf8');
}

function sentinels(count: number): string {
  return '<sentinel/>'.repeat(count);
}

function processCell(pid: number): string {
  return `<process><pid>${pid}</pid></process>`;
}
