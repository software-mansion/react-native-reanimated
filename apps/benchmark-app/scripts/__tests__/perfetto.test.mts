import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  computeTraceMetrics,
  metricsQuery,
  parseQueryOutput,
  traceConfig,
} from '../perfetto.mts';
import type { ResultSet, TraceMetrics, TraceReading } from '../perfetto.mts';

const OUTPUT = fs.readFileSync(
  path.join(import.meta.dirname, 'fixtures', 'trace-processor-output.csv'),
  'utf8'
);
const SUMMARY = '9878221001,1,0,2,591\n';
const SECONDS = 9.878221001;
const APP = { applicationId: 'com.reanimatedbenchmark.a', pid: 13208 };

function metricsOf(reading: TraceReading): TraceMetrics {
  assert.equal(reading.processLived, true);
  return reading.processLived ? reading.metrics : assert.fail();
}

function assertClose(actual: number | null, expected: number) {
  assert.ok(
    actual !== null && Math.abs(actual - expected) < 1e-6,
    `${actual} is not ${expected}`
  );
}

function withSummary(summary: string): ResultSet[] {
  return parseQueryOutput(OUTPUT.replace(SUMMARY, `${summary}\n`));
}

describe('parseQueryOutput', () => {
  it('splits the result sets and reads NULL and quoted cells', () => {
    const sets = parseQueryOutput(OUTPUT);
    assert.equal(sets.length, 8);
    assert.deepEqual(sets[0].columns, [
      'window_ns',
      'app_processes',
      'ended_processes',
      'js_threads',
      'trace_frame_slices',
    ]);
    assert.equal(sets[3].rows.length, 591);
    assert.deepEqual(sets[5], { columns: ['mount_batches'], rows: [['588']] });
    assert.deepEqual(sets[7], { columns: ['name', 'idx', 'value'], rows: [] });
    assert.deepEqual(parseQueryOutput('"a","b"\n"x","[NULL]"\n')[0].rows, [
      ['x', null],
    ]);
  });
});

describe('computeTraceMetrics', () => {
  it('computes all metrics from the query output of a real trace', () => {
    const metrics = metricsOf(
      computeTraceMetrics(parseQueryOutput(OUTPUT), APP, 60)
    );
    assert.equal(metrics.frameCount, 591);
    assertClose(metrics.expectedFrameCount, 60 * SECONDS);
    assertClose(metrics.frameDurationMedian, 12.245769);
    assertClose(metrics.frameDurationP95, 14.598192);
    assertClose(metrics.jankyFrames, 1 - 591 / (60 * SECONDS));
    assertClose(metrics.drawFrameMedian, 10.230846);
    assertClose(metrics.drawFrameP95, 15.5738465);
    assert.equal(metrics.frameTimelineFrameCount, 587);
    assertClose(metrics.frameTimelineDurationMedian, 33.700539);
    assert.equal(metrics.jankFlaggedFrames, 1);
    assert.equal(metrics.appDeadlineMissedFrames, 0);
    assertClose(metrics.uiThreadCpu, 6665.745159 / SECONDS);
    assertClose(metrics.renderThreadCpu, 4634.078004 / SECONDS);
    assertClose(metrics.processCpu, 14883.558033 / SECONDS);
    assert.equal(metrics.mountBatchCount, 588);
    assert.equal(metrics.memory, 111592);
    assert.equal(metrics.memoryGrowth, -51484);
  });

  it('sums the CPU time of all threads with the JS thread name', () => {
    const metrics = metricsOf(
      computeTraceMetrics(parseQueryOutput(OUTPUT), APP, 60)
    );
    assertClose(metrics.jsThreadCpu, (12.564233 + 621.15892) / SECONDS);
  });

  it('gives the share of dropped frames from the refresh rate, and 0 when the app draws more frames', () => {
    const at90 = metricsOf(
      computeTraceMetrics(parseQueryOutput(OUTPUT), APP, 90)
    );
    assertClose(at90.expectedFrameCount, 90 * SECONDS);
    assertClose(at90.jankyFrames, 1 - 591 / (90 * SECONDS));
    const at30 = metricsOf(
      computeTraceMetrics(parseQueryOutput(OUTPUT), APP, 30)
    );
    assert.equal(at30.jankyFrames, 0);
  });

  it('divides the CPU time by the length of the trace window', () => {
    const metrics = metricsOf(
      computeTraceMetrics(withSummary('4939110500,1,0,2,591'), APP, 60)
    );
    assertClose(metrics.uiThreadCpu, 6665.745159 / 4.9391105);
  });

  it('gives a crash when the launched process ended before the window end', () => {
    for (const summary of ['9878221001,1,1,2,591', '9878221001,2,1,2,591']) {
      assert.deepEqual(computeTraceMetrics(withSummary(summary), APP, 60), {
        processLived: false,
        detail: 'the app process 13208 ended before the end of the trace',
      });
    }
  });

  it('stops when the trace lost data', () => {
    const lossy = `${OUTPUT.trimEnd()}\n"ftrace_cpu_overrun_end",0,12\n`;
    assert.throws(
      () => computeTraceMetrics(parseQueryOutput(lossy), APP, 60),
      /ftrace_cpu_overrun_end\[0\] = 12/
    );
  });

  it('stops when the launched process is absent or has no JS thread', () => {
    assert.throws(
      () => computeTraceMetrics(withSummary('9878221001,0,0,2,591'), APP, 60),
      /no process com.reanimatedbenchmark.a with pid 13208/
    );
    assert.throws(
      () => computeTraceMetrics(withSummary('9878221001,1,0,0,591'), APP, 60),
      /no thread "mqt_v_js"/
    );
  });

  it('stops when no thread of the trace has a Choreographer#doFrame slice', () => {
    const sets = withSummary('9878221001,1,0,2,0');
    sets[3] = { columns: ['dur'], rows: [] };
    assert.throws(
      () => computeTraceMetrics(sets, APP, 60),
      /no Choreographer#doFrame% slice on any thread\. The atrace category "view" gave no data/
    );
  });

  it('gives 0 frames and null frame durations when only other threads have a Choreographer#doFrame slice', () => {
    const sets = withSummary('9878221001,1,0,2,120');
    sets[3] = { columns: ['dur'], rows: [] };
    const metrics = metricsOf(computeTraceMetrics(sets, APP, 60));
    assert.equal(metrics.frameCount, 0);
    assert.equal(metrics.jankyFrames, 1);
    assert.equal(metrics.frameDurationMedian, null);
    assert.equal(metrics.frameDurationP90, null);
    assert.equal(metrics.frameDurationP95, null);
    assert.equal(metrics.frameDurationP99, null);
  });

  it('gives null for the stored frame timeline and DrawFrame metrics when they have no rows', () => {
    const sets = parseQueryOutput(OUTPUT);
    sets[2] = { columns: sets[2].columns, rows: [] };
    sets[4] = { columns: ['dur'], rows: [] };
    const metrics = metricsOf(computeTraceMetrics(sets, APP, 60));
    assert.equal(metrics.frameTimelineFrameCount, 0);
    assert.equal(metrics.frameTimelineDurationMedian, null);
    assert.equal(metrics.jankFlaggedFrames, null);
    assert.equal(metrics.drawFrameMedian, null);
    assert.equal(metrics.frameCount, 591);
  });

  it('stops when the trace window is empty', () => {
    assert.throws(
      () => computeTraceMetrics(withSummary('0,1,0,2,591'), APP, 60),
      /trace window is 0 ns long/
    );
  });
});

describe('trace config and query', () => {
  it('names the data sources and the app', () => {
    const config = traceConfig('com.reanimatedbenchmark.a');
    for (const expected of [
      'name: "android.surfaceflinger.frametimeline"',
      'ftrace_events: "sched/sched_switch"',
      'ftrace_events: "sched/sched_process_free"',
      'ftrace_events: "task/task_rename"',
      'atrace_categories: "gfx"',
      'atrace_apps: "com.reanimatedbenchmark.a"',
      'scan_all_processes_on_start: true',
      'proc_stats_poll_ms: 1000',
      'duration_ms: 10000',
    ]) {
      assert.ok(config.includes(expected), expected);
    }
  });

  it('selects the launched process by pid and name in each query', () => {
    const query = metricsQuery({
      applicationId: 'com.reanimatedbenchmark.a',
      pid: 4321,
    });
    const selection = "WHERE pid = 4321 AND name = 'com.reanimatedbenchmark.a'";
    assert.equal(query.split(selection).length - 1, 7);
    assert.equal(query.split('FROM process').length - 1, 7);
  });

  it('counts the mount batches of the app process in the trace window', () => {
    assert.ok(
      metricsQuery(APP).includes(
        "SELECT COUNT(*) AS mount_batches FROM thread_slice\nWHERE name = 'IntBufferBatchMountItem::mountViews';"
      )
    );
  });

  it('clips the sched slices to the trace window and ends unfinished slices at the window end', () => {
    const query = metricsQuery(APP);
    assert.ok(
      query.includes(
        'IIF(sched.dur = -1, trace_window.end_ts, MIN(sched.ts + sched.dur, trace_window.end_ts))'
      )
    );
    assert.ok(query.includes('- MAX(sched.ts, trace_window.start_ts)'));
    assert.ok(
      query.includes(
        '(SELECT end_ts - start_ts FROM trace_window) AS window_ns'
      )
    );
    assert.ok(query.includes('AND ts >= trace_window.start_ts'));
  });

  it('rejects an application id or a pid that is not safe in SQL', () => {
    assert.throws(
      () => metricsQuery({ applicationId: "com.x' OR 1=1 --", pid: 1 }),
      /not a valid application id/
    );
    assert.throws(
      () => metricsQuery({ applicationId: 'com.x', pid: 1.5 }),
      /not a valid process id/
    );
  });
});
