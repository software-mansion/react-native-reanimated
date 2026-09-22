import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Answers } from '../add-changelog.mts';
import {
  parseArguments,
  planFragment,
  slugFromBranch,
  validateAnswers,
  withDefaults,
} from '../add-changelog.mts';

const DIRECTORY = 'packages/react-native-reanimated/changelog';
const COMPLETE: Answers = {
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

  describe('parseArguments', () => {
    it('reads all flags', () => {
      assert.deepEqual(
        parseArguments([
          '--type',
          'feature',
          '--message',
          'Add an API.',
          '--slug',
          'new-api',
        ]),
        { category: 'feature', message: 'Add an API.', slug: 'new-api' }
      );
    });

    it('rejects an unknown flag', () => {
      assert.throws(() => parseArguments(['--nope']));
    });
  });

  describe('withDefaults', () => {
    const noStdin = () => assert.fail('must not read stdin');

    it('takes the slug from the branch', () => {
      const answers = withDefaults({}, 'me/from-branch', noStdin);
      assert.equal(answers.slug, 'from-branch');
    });

    it('keeps an explicit slug and message', () => {
      const answers = withDefaults(
        { slug: 'explicit', message: 'Fix.' },
        'me/from-branch',
        noStdin
      );
      assert.equal(answers.slug, 'explicit');
      assert.equal(answers.message, 'Fix.');
    });

    it('reads the message from stdin for `--message -`', () => {
      const answers = withDefaults(
        { message: '-' },
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
      assert.deepEqual(validateAnswers({}), [
        'Missing: --type, --message, --slug.',
      ]);
    });

    it('rejects a message with more than one line', () => {
      const errors = validateAnswers({ ...COMPLETE, message: 'One.\nTwo.' });
      assert.equal(errors.length, 1);
      assert.match(errors[0], /one line/);
    });

    it('rejects unknown values and a bad message', () => {
      const errors = validateAnswers({
        category: 'chore' as never,
        message: '- Fix a crash',
        slug: 'Bad Slug',
      });
      assert.equal(errors.length, 3);
    });
  });

  describe('planFragment', () => {
    it('plans the file in the given directory', () => {
      assert.deepEqual(
        planFragment(DIRECTORY, COMPLETE, () => false),
        {
          path: `${DIRECTORY}/crash.fix.md`,
          collidedWith: undefined,
        }
      );
    });

    it('adds the first free numeric suffix and reports the collision', () => {
      const taken = new Set([
        `${DIRECTORY}/crash.fix.md`,
        `${DIRECTORY}/crash-2.fix.md`,
      ]);
      assert.deepEqual(
        planFragment(DIRECTORY, COMPLETE, (path) => taken.has(path)),
        {
          path: `${DIRECTORY}/crash-3.fix.md`,
          collidedWith: `${DIRECTORY}/crash.fix.md`,
        }
      );
    });

    it('does not collide with the same slug in another category', () => {
      const { collidedWith } = planFragment(DIRECTORY, COMPLETE, (path) =>
        path.endsWith('crash.feature.md')
      );
      assert.equal(collidedWith, undefined);
    });

    it('throws with the usage when answers are missing', () => {
      assert.throws(
        () => planFragment(DIRECTORY, {}, () => false),
        /Missing: .*\nUsage:/
      );
    });
  });
});
