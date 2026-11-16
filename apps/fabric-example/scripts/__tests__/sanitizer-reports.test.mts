import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  classifyReports,
  parseSanitizerReports,
} from '../sanitizer-reports.mts';

const SCRIPT = path.resolve(import.meta.dirname, '..', 'sanitizer-reports.mts');

const TSAN_REPORT = `==================
WARNING: ThreadSanitizer: data race (pid=90103)
  Read of size 8 at 0x00010aea6588 by main thread:
    #0 YGNodeGetOwner YGNode.cpp:282 (FabricExample:arm64+0x10089cb80)
    #1 facebook::react::YogaLayoutableShadowNode::updateYogaChildrenOwnersIfNeeded() YogaLayoutableShadowNode.cpp:344 (FabricExample:arm64+0x1006181dc)

  Previous write of size 8 at 0x00010aea6588 by thread T8:
    #0 facebook::react::YogaLayoutableShadowNode::updateYogaChildrenOwnersIfNeeded() YogaLayoutableShadowNode.cpp:345 (FabricExample:arm64+0x1006181f8)

SUMMARY: ThreadSanitizer: data race YGNode.cpp:282 in YGNodeGetOwner
==================
`;

const ASAN_REPORT = `=================================================================
==1234==ERROR: AddressSanitizer: heap-use-after-free on address 0x0001 at pc 0x0002
    #0 0x0003 in reanimated::LayoutAnimationsProxy::pullTransaction LayoutAnimationsProxy.cpp:299

SUMMARY: AddressSanitizer: heap-use-after-free LayoutAnimationsProxy.cpp:299 in reanimated::LayoutAnimationsProxy::pullTransaction
==================
`;

const UNKNOWN_TSAN_REPORT = `==================
WARNING: ThreadSanitizer: data race (pid=90103)
  Read of size 8 at 0x1 by main thread:
    #0 reanimated::foo Foo.cpp:1 (FabricExample:arm64+0x1)

SUMMARY: ThreadSanitizer: data race Foo.cpp:1 in reanimated::foo
==================
`;

const UBSAN_REPORTS = `Foo.cpp:1:1: runtime error: upcast of misaligned address 0x1 for type 'facebook::yoga::Node', which requires 8 byte alignment
    #0 0x1 in YGNodeGetOwner YGNode.cpp:282
SUMMARY: UndefinedBehaviorSanitizer: undefined-behavior YGNode.cpp:282:10
Bar.cpp:2:2: runtime error: load of null pointer of type 'int'
    #0 0x2 in reanimated::bar Bar.cpp:2
SUMMARY: UndefinedBehaviorSanitizer: undefined-behavior Bar.cpp:2:2
`;

const KNOWN = [
  {
    sanitizer: 'thread',
    summary: '^data race YGNode\\.cpp:\\d+ in YGNodeGetOwner$',
    reason: 'owner written on the JS thread while the main thread clones',
    upstream: 'https://example.invalid/upstream',
  },
];

describe('parseSanitizerReports', () => {
  it('reads the sanitizer and the summary of a TSAN report', () => {
    const [report] = parseSanitizerReports('tsan.1', TSAN_REPORT);
    assert.equal(report.sanitizer, 'thread');
    assert.equal(report.summary, 'data race YGNode.cpp:282 in YGNodeGetOwner');
  });

  it('reads an ASAN report with an ERROR header and no WARNING line', () => {
    const [report] = parseSanitizerReports('asan.1', ASAN_REPORT);
    assert.equal(report.sanitizer, 'address');
    assert.match(report.summary, /^heap-use-after-free LayoutAnimationsProxy/);
  });

  it('reads an ASAN report without a summary line from its header', () => {
    const [report] = parseSanitizerReports(
      'asan.2',
      ASAN_REPORT.replace(/^SUMMARY: .*$/m, '')
    );
    assert.equal(report.sanitizer, 'address');
    assert.match(report.summary, /^heap-use-after-free on address/);
  });

  it('splits a log file that holds several reports', () => {
    const reports = parseSanitizerReports(
      'tsan.3',
      TSAN_REPORT + UNKNOWN_TSAN_REPORT
    );
    assert.deepEqual(
      reports.map((report) => [report.index, report.summary]),
      [
        [0, 'data race YGNode.cpp:282 in YGNodeGetOwner'],
        [1, 'data race Foo.cpp:1 in reanimated::foo'],
      ]
    );
  });

  it('splits UBSan diagnostics that have no separator lines', () => {
    const reports = parseSanitizerReports('ubsan.1', UBSAN_REPORTS);
    assert.deepEqual(
      reports.map((report) => [report.sanitizer, report.summary]),
      [
        ['undefined-behavior', 'undefined-behavior YGNode.cpp:282:10'],
        ['undefined-behavior', 'undefined-behavior Bar.cpp:2:2'],
      ]
    );
  });

  it('keeps a file without a report header as one unrecognized report', () => {
    const reports = parseSanitizerReports('tsan.2', 'garbage\n');
    assert.equal(reports.length, 1);
    assert.equal(reports[0].sanitizer, '');
    assert.equal(reports[0].summary, 'unrecognized report');
  });
});

describe('classifyReports', () => {
  it('matches a known issue by sanitizer and summary pattern', () => {
    const [tsan] = parseSanitizerReports('tsan.1', TSAN_REPORT);
    const [asan] = parseSanitizerReports('asan.1', ASAN_REPORT);
    const { known, unknown } = classifyReports([tsan, asan], KNOWN);
    assert.deepEqual(
      known.map(({ report }) => report.file),
      ['tsan.1']
    );
    assert.deepEqual(
      unknown.map((report) => report.file),
      ['asan.1']
    );
  });

  it('does not match a known issue of another sanitizer', () => {
    const [report] = parseSanitizerReports(
      'asan.2',
      ASAN_REPORT.replace(
        /heap-use-after-free .* in .*/,
        'data race YGNode.cpp:282 in YGNodeGetOwner'
      )
    );
    assert.equal(classifyReports([report], KNOWN).unknown.length, 1);
  });
});

describe('sanitizer-reports command', () => {
  let workDir = '';

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('passes with only known reports and warns about them', () => {
    workDir = createWorkDir({ 'tsan.1': TSAN_REPORT });
    const result = run(workDir);
    assert.equal(result.status, 0, result.stdout);
    assert.match(
      result.stdout,
      /^::warning title=Known thread sanitizer report::data race YGNode\.cpp:282 in YGNodeGetOwner%0Aowner written/m
    );
    assert.match(
      result.stdout,
      /1 sanitizer report\(s\): 1 known, 0 unknown\./
    );
  });

  it('fails on an unknown report and names it', () => {
    workDir = createWorkDir({ 'tsan.1': TSAN_REPORT, 'asan.1': ASAN_REPORT });
    const result = run(workDir);
    assert.equal(result.status, 1, result.stdout);
    assert.match(
      result.stdout,
      /^::error title=address sanitizer report::heap-use-after-free/m
    );
    assert.match(
      result.stdout,
      /2 sanitizer report\(s\): 1 known, 1 unknown\./
    );
  });

  it('fails when a known report and an unknown report share one log file', () => {
    workDir = createWorkDir({ 'tsan.1': TSAN_REPORT + UNKNOWN_TSAN_REPORT });
    const result = run(workDir);
    assert.equal(result.status, 1, result.stdout);
    assert.match(
      result.stdout,
      /^::group::tsan\.1#2: data race Foo\.cpp:1 in reanimated::foo$/m
    );
    assert.match(
      result.stdout,
      /2 sanitizer report\(s\): 1 known, 1 unknown\./
    );
  });

  it('keeps undefined-behavior entries in address mode', () => {
    workDir = createWorkDir({ 'ubsan.1': UBSAN_REPORTS });
    fs.writeFileSync(
      path.join(workDir, 'sanitizer-known-issues.json'),
      JSON.stringify([
        ...KNOWN,
        {
          sanitizer: 'undefined-behavior',
          summary: '^undefined-behavior YGNode\\.cpp:',
          reason: 'sentinel upcast',
        },
      ])
    );
    const result = run(workDir, ['--sanitizer', 'address']);
    assert.equal(result.status, 1, result.stdout);
    assert.match(
      result.stdout,
      /2 sanitizer report\(s\): 1 known, 1 unknown\./
    );
    assert.match(
      result.stdout,
      /^::error title=undefined-behavior sanitizer report::undefined-behavior Bar\.cpp:2:2/m
    );
  });

  it('passes without reports', () => {
    workDir = createWorkDir({});
    fs.rmSync(path.join(workDir, 'sanitizer-reports'), { recursive: true });
    const result = run(workDir);
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /No sanitizer reports\./);
  });
});

function createWorkDir(reports: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanitizer-reports-'));
  fs.mkdirSync(path.join(dir, 'sanitizer-reports'));
  for (const [name, text] of Object.entries(reports)) {
    fs.writeFileSync(path.join(dir, 'sanitizer-reports', name), text);
  }
  fs.writeFileSync(
    path.join(dir, 'sanitizer-known-issues.json'),
    JSON.stringify(KNOWN)
  );
  return dir;
}

function run(dir: string, extraArgs: string[] = []) {
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', SCRIPT, ...extraArgs],
    { cwd: dir, encoding: 'utf8' }
  );
}
