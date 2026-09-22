import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Answers } from '../add-changelog.mts';
import {
  detectPackages,
  parseArguments,
  planFragments,
  slugFromBranch,
  validateAnswers,
  withDefaults,
} from '../add-changelog.mts';

const COMPLETE: Answers = {
  packages: ['reanimated'],
  category: 'fix',
  message: 'Fix a crash.',
  slug: 'crash',
};

describe('add-changelog', () => {
  describe('slugFromBranch', () => {
    it('drops the text before the first slash', () => {
      assert.equal(slugFromBranch('@pawicao/zindex-la'), 'zindex-la');
      assert.equal(slugFromBranch('user/fix/deep'), 'fix-deep');
    });

    it('uses the whole name when the branch has no slash', () => {
      assert.equal(slugFromBranch('fix-crash'), 'fix-crash');
    });

    it('cleans characters that a slug cannot have', () => {
      assert.equal(slugFromBranch('me/Fix_The..Crash!'), 'fix-the-crash');
    });

    it('gives no slug for a detached HEAD and for shared branches', () => {
      for (const branch of ['', 'main', 'master', '4.7-stable', 'me/___']) {
        assert.equal(slugFromBranch(branch), undefined);
      }
    });

    it('keeps a feature branch that only contains a shared name', () => {
      assert.equal(slugFromBranch('me/main'), 'main');
    });
  });

  describe('detectPackages', () => {
    it('finds each package that has changed files', () => {
      assert.deepEqual(
        detectPackages([
          'packages/react-native-worklets/src/index.ts',
          'apps/common-app/src/App.tsx',
        ]),
        ['worklets']
      );
      assert.deepEqual(
        detectPackages([
          'packages/react-native-worklets/src/index.ts',
          'packages/react-native-reanimated/src/index.ts',
        ]),
        ['reanimated', 'worklets']
      );
    });
  });

  describe('parseArguments', () => {
    it('reads all flags and a repeated --package', () => {
      assert.deepEqual(
        parseArguments([
          '--package',
          'reanimated',
          '--package',
          'worklets',
          '--type',
          'feature',
          '--message',
          'Add an API.',
          '--slug',
          'new-api',
        ]),
        {
          packages: ['reanimated', 'worklets'],
          category: 'feature',
          message: 'Add an API.',
          slug: 'new-api',
        }
      );
    });

    it('reads a repeated package once', () => {
      assert.deepEqual(
        parseArguments(['--package', 'worklets', '--package', 'worklets'])
          .packages,
        ['worklets']
      );
    });

    it('rejects an unknown flag', () => {
      assert.throws(() => parseArguments(['--nope']));
    });
  });

  describe('withDefaults', () => {
    const noStdin = () => assert.fail('must not read stdin');

    it('takes the slug from the branch', () => {
      const answers = withDefaults({ packages: [] }, 'me/from-branch', noStdin);
      assert.equal(answers.slug, 'from-branch');
    });

    it('does not guess the packages', () => {
      const answers = withDefaults({ packages: [] }, 'me/from-branch', noStdin);
      assert.deepEqual(answers.packages, []);
    });

    it('keeps an explicit slug and message', () => {
      const answers = withDefaults(
        { packages: [], slug: 'explicit', message: 'Fix.' },
        'me/from-branch',
        noStdin
      );
      assert.equal(answers.slug, 'explicit');
      assert.equal(answers.message, 'Fix.');
    });

    it('reads the message from stdin for `--message -`', () => {
      const answers = withDefaults(
        { packages: [], message: '-' },
        'me/from-branch',
        () => 'Fix the `measure` crash.\n'
      );
      assert.equal(answers.message, 'Fix the `measure` crash.');
    });
  });

  describe('validateAnswers', () => {
    it('accepts complete answers', () => {
      assert.deepEqual(validateAnswers(COMPLETE), []);
    });

    it('names each missing flag', () => {
      assert.deepEqual(validateAnswers({ packages: [] }), [
        'Missing: --package, --type, --message, --slug.',
      ]);
    });

    it('rejects a message with more than one line', () => {
      const errors = validateAnswers({ ...COMPLETE, message: 'One.\nTwo.' });
      assert.equal(errors.length, 1);
      assert.match(errors[0], /one line/);
    });

    it('rejects unknown values and a bad message', () => {
      const errors = validateAnswers({
        packages: ['gesture-handler' as never],
        category: 'chore' as never,
        message: '- Fix a crash',
        slug: 'Bad Slug',
      });
      assert.equal(errors.length, 4);
    });
  });

  describe('planFragments', () => {
    it('plans one file for each package', () => {
      assert.deepEqual(
        planFragments(
          { ...COMPLETE, packages: ['reanimated', 'worklets'] },
          () => false
        ),
        [
          {
            path: 'packages/react-native-reanimated/changelog/crash.fix.md',
            collidedWith: undefined,
          },
          {
            path: 'packages/react-native-worklets/changelog/crash.fix.md',
            collidedWith: undefined,
          },
        ]
      );
    });

    it('adds the first free numeric suffix and reports the collision', () => {
      const directory = 'packages/react-native-reanimated/changelog';
      const taken = new Set([
        `${directory}/crash.fix.md`,
        `${directory}/crash-2.fix.md`,
      ]);
      assert.deepEqual(
        planFragments(COMPLETE, (path) => taken.has(path)),
        [
          {
            path: `${directory}/crash-3.fix.md`,
            collidedWith: `${directory}/crash.fix.md`,
          },
        ]
      );
    });

    it('does not collide with the same slug in another category', () => {
      const [{ collidedWith }] = planFragments(COMPLETE, (path) =>
        path.endsWith('crash.feature.md')
      );
      assert.equal(collidedWith, undefined);
    });

    it('throws with the usage when answers are missing', () => {
      assert.throws(
        () => planFragments({ packages: [] }, () => false),
        /Missing: .*\nUsage:/
      );
    });
  });
});
