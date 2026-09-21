import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Entry, FragmentFile } from '../squash-changelog.mts';
import {
  extractPullRequest,
  buildAuthorsQuery,
  extractPullRequestOfNewestAdd,
  parseAuthorsResponse,
  insertSection,
  keepPathsFromCut,
  releaseHeading,
  renderSection,
  resolveEntries,
  toFragmentFile,
} from '../squash-changelog.mts';

const NO_RESOLVERS = {
  findPullRequest: () => undefined,
  findAuthors: () => new Map<number, string[]>(),
};

function fragmentFile(overrides: Partial<FragmentFile> = {}): FragmentFile {
  return {
    path: 'packages/react-native-reanimated/changelog/crash.fix.md',
    category: 'fix',
    text: 'Fix a crash.',
    ...overrides,
  };
}

describe('squash-changelog', () => {
  describe('extractPullRequest', () => {
    it('reads the number from a squash-merge subject', () => {
      assert.equal(extractPullRequest('fix: a crash (#10613)'), 10613);
    });

    it('takes the original pull request of a cherry-pick', () => {
      assert.equal(extractPullRequest('fix: a crash (#10613) (#10650)'), 10613);
    });

    it('gives nothing for a subject with no number', () => {
      assert.equal(extractPullRequest('fix: a crash'), undefined);
      assert.equal(extractPullRequest(''), undefined);
    });
  });

  describe('extractPullRequestOfNewestAdd', () => {
    it('takes the newest add when a release deleted the path before', () => {
      assert.equal(
        extractPullRequestOfNewestAdd(
          'fix: second crash (#200)\nfix: first crash (#100)\n'
        ),
        200
      );
    });

    it('gives nothing for a file with no commit', () => {
      assert.equal(extractPullRequestOfNewestAdd(''), undefined);
    });
  });

  describe('buildAuthorsQuery', () => {
    it('asks for all pull requests in one query, each number once', () => {
      assert.equal(
        buildAuthorsQuery([8, 5, 8]),
        'query { repository(owner: "software-mansion", name: "react-native-reanimated") { pr8: pullRequest(number: 8) { author { login } } pr5: pullRequest(number: 5) { author { login } } } }'
      );
    });
  });

  describe('parseAuthorsResponse', () => {
    it('maps each pull request to its author', () => {
      assert.deepEqual(
        parseAuthorsResponse(
          JSON.stringify({
            data: {
              repository: {
                pr8: { author: { login: 'pawicao' } },
                pr5: { author: { login: 'tjzel' } },
              },
            },
          })
        ),
        new Map([
          [8, ['pawicao']],
          [5, ['tjzel']],
        ])
      );
    });

    it('names a number that is not a pull request', () => {
      assert.throws(
        () =>
          parseAuthorsResponse(
            JSON.stringify({
              data: {
                repository: { pr5: null, pr8: { author: { login: 'a' } } },
              },
              errors: [{ message: 'Could not resolve to a PullRequest' }],
            })
          ),
        /no pull request #5\./
      );
    });

    it('drops the author of a deleted account', () => {
      assert.deepEqual(
        parseAuthorsResponse(
          JSON.stringify({
            data: {
              repository: {
                pr1: { author: null },
                pr2: { author: { login: 'ghost' } },
              },
            },
          })
        ),
        new Map([
          [1, []],
          [2, []],
        ])
      );
    });
  });

  describe('keepPathsFromCut', () => {
    const paths = ['dir/before-cut.fix.md', 'dir/after-cut.fix.md'];

    it('drops the fragments that came after the stable branch was cut', () => {
      assert.deepEqual(
        keepPathsFromCut(paths, [
          'dir/README.md',
          'dir/before-cut.fix.md',
          'dir/gone.fix.md',
        ]),
        ['dir/before-cut.fix.md']
      );
    });

    it('keeps all fragments when no cut is given', () => {
      assert.deepEqual(keepPathsFromCut(paths, undefined), paths);
    });
  });

  describe('toFragmentFile', () => {
    it('joins the category from the name with the parsed body', () => {
      assert.deepEqual(toFragmentFile('dir/crash.fix.md', 'Fix.\npr: 7\n'), {
        path: 'dir/crash.fix.md',
        category: 'fix',
        text: 'Fix.',
        pullRequest: 7,
      });
    });

    it('throws for a bad name or a bad body', () => {
      assert.throws(
        () => toFragmentFile('dir/notes.md', 'Fix.'),
        /not a valid fragment/
      );
      assert.throws(() => toFragmentFile('dir/crash.fix.md', 'Fix'), /period/);
    });
  });

  describe('resolveEntries', () => {
    it('resolves the pull request and the author through the resolvers', () => {
      const entries = resolveEntries(
        [fragmentFile()],
        {
          findPullRequest: (path) => (path.endsWith('crash.fix.md') ? 42 : 0),
          findAuthors: (pullRequests) =>
            new Map(pullRequests.map((n) => [n, [`author-of-${n}`]])),
        },
        { allowUnresolved: false }
      );
      assert.deepEqual(entries, [
        {
          category: 'fix',
          text: 'Fix a crash.',
          pullRequest: 42,
          authors: ['author-of-42'],
        },
      ]);
    });

    it('looks up all authors in one call', () => {
      const calls: number[][] = [];
      resolveEntries(
        [fragmentFile({ pullRequest: 1 }), fragmentFile({ pullRequest: 2 })],
        {
          findPullRequest: () => undefined,
          findAuthors: (pullRequests) => {
            calls.push(pullRequests);
            return new Map();
          },
        },
        { allowUnresolved: false }
      );
      assert.deepEqual(calls, [[1, 2]]);
    });

    it('gives the `pr:` and `by:` lines precedence over the lookups', () => {
      const [entry] = resolveEntries(
        [fragmentFile({ pullRequest: 7, authors: ['a', 'b'] })],
        {
          findPullRequest: () => assert.fail('must not look up the number'),
          findAuthors: (pullRequests) => {
            assert.deepEqual(pullRequests, []);
            return new Map([[7, ['looked-up']]]);
          },
        },
        { allowUnresolved: false }
      );
      assert.equal(entry.pullRequest, 7);
      assert.deepEqual(entry.authors, ['a', 'b']);
    });

    it('fails on an unresolved pull request and names the fragment', () => {
      assert.throws(
        () =>
          resolveEntries([fragmentFile()], NO_RESOLVERS, {
            allowUnresolved: false,
          }),
        /crash\.fix\.md.*`pr: <number>`/
      );
    });

    it('keeps an unresolved pull request in a preview', () => {
      const [entry] = resolveEntries([fragmentFile()], NO_RESOLVERS, {
        allowUnresolved: true,
      });
      assert.equal(entry.pullRequest, undefined);
      assert.deepEqual(entry.authors, []);
    });
  });

  describe('renderSection', () => {
    const entries: Entry[] = [
      { category: 'fix', text: 'Older fix.', pullRequest: 5, authors: ['a'] },
      { category: 'other', text: 'Other.', pullRequest: 9, authors: [] },
      {
        category: 'fix',
        text: 'Newer fix.',
        pullRequest: 8,
        authors: ['a', 'b'],
      },
      { category: 'fix', text: 'Pending fix.', authors: [] },
      { category: 'breaking', text: 'Break.', pullRequest: 1, authors: ['c'] },
    ];

    it('groups by category, skips empty ones and sorts newest first', () => {
      assert.equal(
        renderSection('## 4.8.0 — 2026-10-01', entries),
        [
          '## 4.8.0 — 2026-10-01',
          '',
          '### 🛠 Breaking changes',
          '',
          '- Break. ([#1](https://github.com/software-mansion/react-native-reanimated/pull/1) by [@c](https://github.com/c))',
          '',
          '### 🐛 Bug fixes',
          '',
          '- Pending fix. (this PR)',
          '- Newer fix. ([#8](https://github.com/software-mansion/react-native-reanimated/pull/8) by [@a](https://github.com/a), [@b](https://github.com/b))',
          '- Older fix. ([#5](https://github.com/software-mansion/react-native-reanimated/pull/5) by [@a](https://github.com/a))',
          '',
          '### 💡 Others',
          '',
          '- Other. ([#9](https://github.com/software-mansion/react-native-reanimated/pull/9))',
        ].join('\n')
      );
    });

    it('renders only the heading when there are no entries', () => {
      assert.equal(renderSection('## Unpublished', []), '## Unpublished');
    });
  });

  describe('releaseHeading', () => {
    it('matches the format of the published sections', () => {
      assert.equal(
        releaseHeading('4.7.0', '2026-09-18'),
        '## 4.7.0 — 2026-09-18'
      );
    });
  });

  describe('insertSection', () => {
    it('puts the section above the newest published version', () => {
      assert.equal(
        insertSection(
          '# Changelog\n\n## 4.7.0 — 2026-09-18\n\n- Old.\n',
          '## 4.8.0 — 2026-10-01\n\n- New.'
        ),
        '# Changelog\n\n## 4.8.0 — 2026-10-01\n\n- New.\n\n## 4.7.0 — 2026-09-18\n\n- Old.\n'
      );
    });

    it('ignores a `## ` line that is not a version heading', () => {
      assert.equal(
        insertSection(
          '# Changelog\n\n<!--\n## Note\n-->\n\n## 1.0.0 — 2026-01-01\n',
          '## 1.1.0 — 2026-02-01\n\n- New.'
        ),
        '# Changelog\n\n<!--\n## Note\n-->\n\n## 1.1.0 — 2026-02-01\n\n- New.\n\n## 1.0.0 — 2026-01-01\n'
      );
    });

    it('appends the section to a changelog with no versions', () => {
      assert.equal(
        insertSection('# Changelog\n', '## 4.8.0 — 2026-10-01\n\n- New.'),
        '# Changelog\n\n## 4.8.0 — 2026-10-01\n\n- New.\n'
      );
    });
  });
});
