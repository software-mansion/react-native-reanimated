import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  LAUNCHES_PER_BLOCK,
  checkSchedule,
  leakVerdict,
  parseMeminfo,
  readingTimes,
  tailLevel,
  tailSlope,
} from '../memory-series.mts';
import type { MemoryReading } from '../memory-series.mts';

const MEMINFO = fs.readFileSync(
  path.join(import.meta.dirname, 'fixtures', 'meminfo.txt'),
  'utf8'
);

function series(totalPssAt: (seconds: number) => number): MemoryReading[] {
  return readingTimes({ intervalSeconds: 60, durationSeconds: 1200 }).map(
    (seconds) => ({
      seconds,
      totalPss: totalPssAt(seconds),
      nativeHeap: 0,
      dalvikHeap: 0,
      graphics: 0,
      privateOther: 0,
      totalSwapPss: 0,
    })
  );
}

describe('parseMeminfo', () => {
  it('reads the totals, the heaps and the summary of dumpsys meminfo', () => {
    assert.deepEqual(parseMeminfo(MEMINFO), {
      totalPss: 170035,
      nativeHeap: 37153,
      dalvikHeap: 9742,
      graphics: 26073,
      privateOther: 30276,
      totalSwapPss: 485,
    });
  });

  it('names the fields that it cannot read', () => {
    assert.throws(
      () => parseMeminfo('No process found for: com.reanimatedbenchmark.a'),
      /Cannot read totalPss, nativeHeap, dalvikHeap, graphics, privateOther, totalSwapPss from dumpsys meminfo/
    );
    assert.throws(
      () => parseMeminfo(MEMINFO.replace(/^\s*Graphics:.*$/m, '')),
      /Cannot read graphics from/
    );
  });
});

describe('readingTimes and checkSchedule', () => {
  it('reads at each interval until the end of the duration', () => {
    assert.deepEqual(
      readingTimes({ intervalSeconds: 60, durationSeconds: 240 }),
      [60, 120, 180, 240]
    );
    assert.equal(
      readingTimes({ intervalSeconds: 60, durationSeconds: 1200 }).length,
      20
    );
  });

  it('needs a duration of at least 4 intervals that is a multiple of the interval', () => {
    checkSchedule({ intervalSeconds: 60, durationSeconds: 240 });
    assert.throws(
      () => checkSchedule({ intervalSeconds: 60, durationSeconds: 180 }),
      /at least 4 times --interval/
    );
    assert.throws(
      () => checkSchedule({ intervalSeconds: 60, durationSeconds: 250 }),
      /must be a multiple of --interval/
    );
  });

  it('launches each variant two times in each block', () => {
    assert.equal(LAUNCHES_PER_BLOCK, 2);
  });
});

describe('tailLevel', () => {
  it('takes the median total PSS of the last quarter of the duration', () => {
    const readings = series((seconds) => (seconds >= 900 ? seconds : 0));
    assert.equal(tailLevel(readings, 1200), 1050);
  });

  it('stops when the last quarter has no reading', () => {
    assert.throws(
      () => tailLevel(series(() => 1).slice(0, 10), 1200),
      /fewer than 1 readings at or after 900 s/
    );
  });
});

describe('tailSlope', () => {
  it('gives the slope of a straight line in kB per minute', () => {
    const readings = series((seconds) => 150000 + (seconds / 60) * 500);
    assert.ok(Math.abs(tailSlope(readings, 1200) - 500) < 1e-9);
  });

  it('uses only the second half of the duration', () => {
    const riseThenStable = series((seconds) =>
      seconds < 600 ? 100000 + seconds * 100 : 200000
    );
    assert.equal(tailSlope(riseThenStable, 1200), 0);
  });

  it('gives the least-squares slope of points that are not on a line', () => {
    const readings = series((seconds) => {
      const offsets: Record<number, number> = { 600: 0, 660: 3000, 720: 0 };
      return offsets[seconds] ?? 0;
    });
    const minutes = Array.from({ length: 11 }, (_, i) => 10 + i);
    const meanMinute = 15;
    const meanPss = 3000 / 11;
    const covariance = minutes.reduce(
      (sum, minute) =>
        sum + (minute - meanMinute) * ((minute === 11 ? 3000 : 0) - meanPss),
      0
    );
    const variance = minutes.reduce(
      (sum, minute) => sum + (minute - meanMinute) ** 2,
      0
    );
    assert.ok(
      Math.abs(tailSlope(readings, 1200) - covariance / variance) < 1e-9
    );
    assert.ok(tailSlope(readings, 1200) < 0);
  });
});

describe('leakVerdict', () => {
  it('gives rises only when the slope of each launch is above the limit', () => {
    assert.equal(leakVerdict([1200, 1500], 2, 1000), 'rises');
    assert.equal(leakVerdict([1200, 900], 2, 1000), 'stable');
    assert.equal(leakVerdict([1000, 1000], 2, 1000), 'stable');
    assert.equal(leakVerdict([-400, 100], 2, 1000), 'stable');
  });

  it('gives not decided when a launch is missing', () => {
    assert.equal(leakVerdict([5000], 2, 1000), 'not decided');
    assert.equal(leakVerdict([], 2, 1000), 'not decided');
  });
});
