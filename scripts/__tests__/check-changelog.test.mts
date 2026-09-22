import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Change } from '../check-changelog.mts';
import { findProblems, parseNameStatus } from '../check-changelog.mts';

const REANIMATED = 'packages/react-native-reanimated';
const WORKLETS = 'packages/react-native-worklets';

function check(
  changes: Change[],
  files: Record<string, string> = {},
  releasedPackagePaths = new Set<string>()
) {
  return findProblems({
    changes,
    readFile: (path) => files[path] ?? 'Fix a crash.\n',
    releasedPackagePaths,
  });
}

function added(path: string): Change {
  return { status: 'added', path };
}

describe('check-changelog', () => {
  it('requires a fragment for a Reanimated change', () => {
    const problems = check([
      { status: 'modified', path: `${REANIMATED}/src/index.ts` },
    ]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /react-native-reanimated changed/);
  });

  it('requires a fragment in each changed package', () => {
    const problems = check([
      added(`${REANIMATED}/src/index.ts`),
      added(`${WORKLETS}/src/index.ts`),
      added(`${REANIMATED}/changelog/new-api.feature.md`),
    ]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /react-native-worklets changed/);
  });

  it('accepts an added fragment in each changed package', () => {
    assert.deepEqual(
      check([
        added(`${REANIMATED}/src/index.ts`),
        added(`${REANIMATED}/changelog/new-api.feature.md`),
        added(`${WORKLETS}/src/index.ts`),
        added(`${WORKLETS}/changelog/new-api.fix.md`),
      ]),
      []
    );
  });

  it('does not accept a modified fragment in place of a new one', () => {
    const problems = check([
      added(`${WORKLETS}/src/index.ts`),
      { status: 'modified', path: `${WORKLETS}/changelog/old.fix.md` },
    ]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /no new fragment/);
  });

  it('does not accept the fragments README as a fragment', () => {
    const problems = check([
      added(`${REANIMATED}/src/index.ts`),
      { status: 'modified', path: `${REANIMATED}/changelog/README.md` },
    ]);
    assert.equal(problems.length, 1);
  });

  it('accepts a pull request that changes only fragments', () => {
    assert.deepEqual(
      check([
        { status: 'modified', path: `${REANIMATED}/changelog/typo.fix.md` },
      ]),
      []
    );
  });

  it('ignores changes outside the two published packages', () => {
    assert.deepEqual(
      check([
        added('docs/docs-reanimated/docs/fundamentals/getting-started.mdx'),
        added('apps/common-app/src/App.tsx'),
      ]),
      []
    );
  });

  it('rejects a bad fragment file name', () => {
    const problems = check([added(`${REANIMATED}/changelog/New_API.md`)]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /New_API\.md: The file name must be/);
  });

  it('reports each body error with the fragment path', () => {
    const path = `${REANIMATED}/changelog/crash.fix.md`;
    const problems = check([added(path)], {
      [path]: '- Fix a crash\nsecond line\n',
    });
    assert.equal(problems.length, 2);
    assert.ok(problems.every((problem) => problem.startsWith(`${path}: `)));
  });

  it('rejects an edit of CHANGELOG.md', () => {
    const problems = check([
      { status: 'modified', path: `${REANIMATED}/CHANGELOG.md` },
      added(`${REANIMATED}/changelog/crash.fix.md`),
    ]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /release pull request/);
  });

  it('reports an edit of only CHANGELOG.md once', () => {
    const problems = check([
      { status: 'modified', path: `${WORKLETS}/CHANGELOG.md` },
    ]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /release pull request/);
  });

  it('rejects a deleted fragment', () => {
    const problems = check([
      { status: 'deleted', path: `${WORKLETS}/changelog/crash.fix.md` },
    ]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /deleted only in a release/);
  });

  it('lets a release pull request squash the fragments', () => {
    assert.deepEqual(
      check(
        [
          { status: 'modified', path: `${REANIMATED}/package.json` },
          { status: 'modified', path: `${REANIMATED}/CHANGELOG.md` },
          { status: 'deleted', path: `${REANIMATED}/changelog/crash.fix.md` },
        ],
        {},
        new Set([REANIMATED])
      ),
      []
    );
  });

  it('keeps the release exception package-specific', () => {
    const problems = check(
      [
        { status: 'modified', path: `${REANIMATED}/package.json` },
        { status: 'modified', path: `${WORKLETS}/CHANGELOG.md` },
      ],
      {},
      new Set([REANIMATED])
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0], /react-native-worklets\/CHANGELOG\.md/);
  });

  it('still validates fragments in a release pull request', () => {
    const path = `${REANIMATED}/changelog/crash.fix.md`;
    const problems = check(
      [added(path)],
      { [path]: '- Fix a crash' },
      new Set([REANIMATED])
    );
    assert.equal(problems.length, 1);
  });

  it('reports a fragment that a rename moves out of the folder', () => {
    const problems = check(
      parseNameStatus(
        `R100\0${REANIMATED}/changelog/crash.fix.md\0docs/crash.md\0`
      )
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0], /deleted only in a release/);
  });

  it('requires a fragment when a rename moves a source file out', () => {
    const problems = check(
      parseNameStatus(`R090\0${REANIMATED}/src/a.ts\0apps/a.ts\0`)
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0], /no new fragment/);
  });

  describe('parseNameStatus', () => {
    it('maps git statuses and splits a rename into a delete and an add', () => {
      assert.deepEqual(
        parseNameStatus(
          [
            'A',
            'a.md',
            'M',
            'b.md',
            'D',
            'c.md',
            'R087',
            'old.fix.md',
            'new.fix.md',
            'C100',
            'source.md',
            'copy.md',
            'T',
            'd.md',
            '',
          ].join('\0')
        ),
        [
          { status: 'added', path: 'a.md' },
          { status: 'modified', path: 'b.md' },
          { status: 'deleted', path: 'c.md' },
          { status: 'deleted', path: 'old.fix.md' },
          { status: 'added', path: 'new.fix.md' },
          { status: 'added', path: 'copy.md' },
          { status: 'modified', path: 'd.md' },
        ]
      );
    });

    it('keeps a path with spaces, quotes and non-ASCII characters', () => {
      assert.deepEqual(parseNameStatus('A\0dir/a "b" ż.ts\0'), [
        { status: 'added', path: 'dir/a "b" ż.ts' },
      ]);
    });
  });
});
