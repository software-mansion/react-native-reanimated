import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterAppLogcat,
  parsePidof,
} from '../android-process-diagnostics.mts';

const APP = 'com.fabricexample';

describe('filterAppLogcat', () => {
  it('keeps the lines of the app pids that logcat records', () => {
    const logcat = [
      '11-20 10:00:00.000  1500  1600 I ActivityManager: Start proc 4242:com.fabricexample/u0a190 for top-activity {com.fabricexample/com.fabricexample.MainActivity}',
      '11-20 10:00:01.000  4242  4300 I ReactNativeJS: first process',
      '11-20 10:00:02.000  1500  1600 I am_proc_start: [0,5151,10190,com.fabricexample,activity,{com.fabricexample/com.fabricexample.MainActivity}]',
      '11-20 10:00:03.000  5151  5200 W ReactNativeJS: second process',
      '11-20 10:00:04.000  2000  2001 I OtherApp: unrelated',
    ].join('\n');

    assert.deepEqual(
      filterAppLogcat(logcat, APP, []).map((line) =>
        line.replace(/^.*? [VDIWEF] /, '')
      ),
      [
        'ActivityManager: Start proc 4242:com.fabricexample/u0a190 for top-activity {com.fabricexample/com.fabricexample.MainActivity}',
        'ReactNativeJS: first process',
        'am_proc_start: [0,5151,10190,com.fabricexample,activity,{com.fabricexample/com.fabricexample.MainActivity}]',
        'ReactNativeJS: second process',
      ]
    );
  });

  it('keeps the lines of a pid that is alive now', () => {
    const logcat = [
      '11-20 10:00:01.000  7777  7778 I ReactNativeJS: alive',
      '11-20 10:00:02.000  2000  2001 I OtherApp: unrelated',
    ].join('\n');

    assert.deepEqual(filterAppLogcat(logcat, APP, ['7777']), [
      '11-20 10:00:01.000  7777  7778 I ReactNativeJS: alive',
    ]);
  });

  it('keeps the process kill lines of any process', () => {
    const logcat = [
      "11-20 10:00:00.000   300   300 I lowmemorykiller: Kill 'com.other' (999), uid 10100, oom_score_adj 900",
      '11-20 10:00:00.100   300   300 I lmkd    : Reclaimed 1024kB',
      '11-20 10:00:00.200  1500  1600 I ActivityManager: Killing 999:com.other/u0a100 (adj 900): lmk',
      '11-20 10:00:00.300  1500  1600 I ActivityManager: Process com.other (pid 999) has died: cch',
      '11-20 10:00:00.400  1500  1600 I am_kill : [0,999,com.other,900,lmk]',
      '11-20 10:00:00.500  1500  1600 I am_proc_died: [0,999,com.other,900,17]',
      '11-20 10:00:00.600  1500  1600 I ActivityManager: Displayed com.other/.Main',
    ].join('\n');

    assert.equal(filterAppLogcat(logcat, APP, []).length, 6);
  });

  it('does not match a package whose name only starts with the app id', () => {
    const logcat = [
      '11-20 10:00:00.000  1500  1600 I ActivityManager: Start proc 8888:com.fabricexample.other/u0a191 for service',
      '11-20 10:00:01.000  8888  8889 I Other: line',
    ].join('\n');

    assert.deepEqual(
      filterAppLogcat(logcat, APP, []).map((line) =>
        line.replace(/^.*? [VDIWEF] /, '')
      ),
      [
        'ActivityManager: Start proc 8888:com.fabricexample.other/u0a191 for service',
      ]
    );
  });

  it('keeps the last app lines and the last kill lines within their limits', () => {
    const appLines = Array.from(
      { length: 5 },
      (_, index) =>
        `11-20 10:00:0${index}.000  4242  4300 I ReactNativeJS: app ${index}`
    );
    const killLines = Array.from(
      { length: 5 },
      (_, index) =>
        `11-20 10:00:0${index}.500  1500  1600 I am_kill : [0,99${index},com.other,0,lmk ${index}]`
    );
    const logcat = appLines
      .flatMap((line, index) => [line, killLines[index]])
      .join('\n');

    assert.deepEqual(
      filterAppLogcat(logcat, APP, ['4242'], { app: 3, processDeath: 2 }),
      [appLines[2], appLines[3], killLines[3], appLines[4], killLines[4]]
    );
  });
});

describe('parsePidof', () => {
  it('returns the pids', () => {
    assert.deepEqual(parsePidof('4242 5151\n'), ['4242', '5151']);
  });

  it('returns nothing for an empty or error output', () => {
    assert.deepEqual(parsePidof(''), []);
    assert.deepEqual(parsePidof('pidof: not found\n'), []);
  });
});
