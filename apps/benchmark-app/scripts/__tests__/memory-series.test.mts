import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  checkSchedule,
  checkedFrameCounter,
  drawingFloor,
  exitCodeOfVerdicts,
  launchCount,
  leakVerdict,
  memoryLaunchOrder,
  parseGfxinfo,
  parseMeminfo,
  readingProblem,
  readingTimes,
  tailLevel,
  tailSlope,
} from '../memory-series.mts';
import type { CountedFrames, MemoryReading } from '../memory-series.mts';

const MEMINFO = fixture('meminfo.txt');
const GFXINFO = fixture('gfxinfo.txt');
const GFXINFO_PID = 2617;
const GFXINFO_STATS_SINCE = 25385044445;
const SCHEDULE = { intervalSeconds: 60, durationSeconds: 1200 };
const FLOOR_AT_60_HZ = 15;

function fixture(name: string): string {
  return fs.readFileSync(
    path.join(import.meta.dirname, 'fixtures', name),
    'utf8'
  );
}

function series(
  totalPssAt: (seconds: number) => number,
  measuredAt: (plannedSeconds: number) => number = (planned) => planned
): MemoryReading[] {
  return readingTimes(SCHEDULE).map((plannedSeconds) =>
    reading(plannedSeconds, measuredAt(plannedSeconds), totalPssAt)
  );
}

function reading(
  plannedSeconds: number,
  seconds: number,
  totalPssAt: (seconds: number) => number = () => 0,
  frames: Partial<CountedFrames> = {}
): MemoryReading {
  return {
    plannedSeconds,
    seconds,
    meminfoMs: 300,
    frameSeconds: seconds + 0.2,
    frameCount: (seconds + 0.2) * 60,
    statsSinceNs: GFXINFO_STATS_SINCE,
    ...frames,
    batteryLevel: 80,
    batteryTemperature: 30,
    totalPss: totalPssAt(seconds),
    nativeHeap: 0,
    dalvikHeap: 0,
    graphics: 0,
    privateOther: 0,
    totalSwapPss: 0,
  };
}

function gfxinfoWith(change: { pid?: number; statsSince?: number }): string {
  return GFXINFO.replace(
    `pid ${GFXINFO_PID} [`,
    `pid ${change.pid ?? GFXINFO_PID} [`
  ).replace(
    `Stats since: ${GFXINFO_STATS_SINCE}ns`,
    `Stats since: ${change.statsSince ?? GFXINFO_STATS_SINCE}ns`
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

  it('gives null when the app has no process', () => {
    assert.equal(
      parseMeminfo('No process found for: com.reanimatedbenchmark.a\n'),
      null
    );
  });

  it('names the fields that it cannot read', () => {
    assert.throws(
      () => parseMeminfo('Applications Memory Usage (in Kilobytes):'),
      /Cannot read totalPss, nativeHeap, dalvikHeap, graphics, privateOther, totalSwapPss from dumpsys meminfo/
    );
    assert.throws(
      () => parseMeminfo(MEMINFO.replace(/^\s*Graphics:.*$/m, '')),
      /Cannot read graphics from/
    );
  });
});

describe('parseGfxinfo', () => {
  it('reads the pid, "Stats since" and "Total frames rendered" of a real dump', () => {
    assert.deepEqual(parseGfxinfo(GFXINFO), {
      pid: GFXINFO_PID,
      statsSinceNs: GFXINFO_STATS_SINCE,
      frameCount: 24,
    });
  });

  it('gives null when the app has no process', () => {
    assert.equal(
      parseGfxinfo('No process found for: com.reanimatedbenchmark.a\n'),
      null
    );
  });

  it('stops when the dump has no header for the process', () => {
    assert.throws(
      () => parseGfxinfo(GFXINFO.replace(/^\*\*.*\*\*$/m, '')),
      /Cannot read the pid, "Stats since" and "Total frames rendered" from dumpsys gfxinfo/
    );
  });
});

describe('checkedFrameCounter', () => {
  it('accepts the counter of the launch process', () => {
    assert.deepEqual(
      checkedFrameCounter(parseGfxinfo(GFXINFO), GFXINFO_PID),
      parseGfxinfo(GFXINFO)
    );
  });

  it('rejects a counter of another process and a missing process', () => {
    assert.equal(
      checkedFrameCounter(
        parseGfxinfo(gfxinfoWith({ pid: 4321 })),
        GFXINFO_PID
      ),
      'dumpsys gfxinfo gives process 4321, the launch has process 2617'
    );
    assert.equal(
      checkedFrameCounter(null, GFXINFO_PID),
      'dumpsys gfxinfo found no process of the app (process 2617)'
    );
  });
});

describe('readingProblem', () => {
  const previous: CountedFrames = {
    frameSeconds: 60.2,
    frameCount: 3612,
    statsSinceNs: GFXINFO_STATS_SINCE,
  };

  it('accepts a reading on time with enough frames', () => {
    assert.equal(
      readingProblem(reading(120, 120.4), previous, SCHEDULE, FLOOR_AT_60_HZ),
      null
    );
  });

  it('gives late when the reading comes more than half an interval after its planned time', () => {
    assert.equal(
      readingProblem(reading(120, 150), previous, SCHEDULE, FLOOR_AT_60_HZ),
      null
    );
    assert.deepEqual(
      readingProblem(reading(120, 150.5), previous, SCHEDULE, FLOOR_AT_60_HZ),
      {
        cause: 'late',
        detail: 'the reading of 120 s came at 150.5 s, more than 30 s late',
      }
    );
  });

  it('gives reset when "Stats since" of the real dump changes or the count goes down', () => {
    const reset = parseGfxinfo(gfxinfoWith({ statsSince: 99000000000 }));
    assert.ok(reset !== null);
    const problem = readingProblem(
      reading(120, 120, () => 0, { statsSinceNs: reset.statsSinceNs }),
      previous,
      SCHEDULE,
      FLOOR_AT_60_HZ
    );
    assert.equal(problem?.cause, 'reset');
    assert.match(
      problem?.detail ?? '',
      /frame counter of dumpsys gfxinfo was reset before the reading of 120 s \(stats since 25385044445 ns -> 99000000000 ns/
    );
    assert.equal(
      readingProblem(
        reading(120, 120, () => 0, { frameCount: 3611 }),
        previous,
        SCHEDULE,
        FLOOR_AT_60_HZ
      )?.cause,
      'reset'
    );
  });

  it('gives drawing when the app drew fewer frames than the floor, from the times of the frame counts', () => {
    const counted = (frameSeconds: number, frames: number) =>
      reading(120, 120, () => 0, {
        frameSeconds,
        frameCount: previous.frameCount + frames,
      });
    assert.equal(
      readingProblem(counted(100.2, 600), previous, SCHEDULE, FLOOR_AT_60_HZ),
      null
    );
    assert.deepEqual(
      readingProblem(counted(100.2, 599), previous, SCHEDULE, FLOOR_AT_60_HZ),
      {
        cause: 'drawing',
        detail:
          '599 frames in the 40.0 s before the reading of 120 s, expected at least 15 frames per second',
      }
    );
  });
});

describe('drawingFloor', () => {
  it('is 25% of the display refresh rate', () => {
    assert.equal(drawingFloor(60), 15);
    assert.equal(drawingFloor(120), 30);
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
});

describe('memoryLaunchOrder and launchCount', () => {
  it('gives one launch for each block in the order A B B A, B A A B', () => {
    const order = Array.from({ length: 10 }, (_, launch) =>
      memoryLaunchOrder(launch).join('')
    ).join('');
    assert.equal(order, 'abbabaabab');
    assert.equal(launchCount(3), 6);
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

  it('uses the measured time of each reading, not the planned time', () => {
    const readings = series(
      (seconds) => (seconds / 60) * 1000,
      (planned) => planned + (planned % 120 === 0 ? 25 : 0)
    );
    assert.ok(Math.abs(tailSlope(readings, 1200) - 1000) < 1e-9);
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
  it('gives rises, no rise found or mixed from the slope of each launch', () => {
    assert.equal(leakVerdict([1200, 1500], 2, 1000, 1200), 'rises');
    assert.equal(leakVerdict([1000, -400], 2, 1000, 1200), 'no rise found');
    assert.equal(leakVerdict([1200, 900], 2, 1000, 1200), 'mixed');
  });

  it('gives not decided when a launch is missing', () => {
    assert.equal(leakVerdict([5000], 2, 1000, 1200), 'not decided');
    assert.equal(leakVerdict([], 2, 1000, 1200), 'not decided');
  });

  it('does not judge a duration under 600 s', () => {
    assert.equal(
      leakVerdict([5000, 5000], 2, 1000, 540),
      'not judged (duration under 600 s)'
    );
    assert.equal(leakVerdict([5000, 5000], 2, 1000, 600), 'rises');
  });
});

describe('exitCodeOfVerdicts', () => {
  it('gives 1 for mixed and not decided, and 0 for the other verdicts', () => {
    assert.equal(
      exitCodeOfVerdicts([
        'rises',
        'no rise found',
        'not judged (duration under 600 s)',
      ]),
      0
    );
    assert.equal(exitCodeOfVerdicts(['rises', 'mixed']), 1);
    assert.equal(exitCodeOfVerdicts(['not decided', 'rises']), 1);
  });
});
