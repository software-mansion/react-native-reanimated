import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  REPOSITORY_ROOT,
  isValidSlug,
  packagePathFromCwd,
  parseFragment,
  parseFragmentFileName,
} from '../fragments.mts';

describe('changelog/fragments', () => {
  describe('parseFragmentFileName', () => {
    it('reads the slug and the category', () => {
      assert.deepEqual(parseFragmentFileName('zindex-la.fix.md'), {
        slug: 'zindex-la',
        category: 'fix',
      });
    });

    it('accepts each category', () => {
      for (const category of ['breaking', 'feature', 'fix', 'other']) {
        assert.equal(
          parseFragmentFileName(`slug.${category}.md`)?.category,
          category
        );
      }
    });

    it('rejects an unknown category, a bad slug and a missing category', () => {
      assert.equal(parseFragmentFileName('slug.chore.md'), undefined);
      assert.equal(parseFragmentFileName('Slug_Name.fix.md'), undefined);
      assert.equal(parseFragmentFileName('slug.md'), undefined);
      assert.equal(parseFragmentFileName('-slug.fix.md'), undefined);
    });
  });

  describe('packagePathFromCwd', () => {
    it('maps a package directory to its repository path', () => {
      assert.equal(
        packagePathFromCwd(`${REPOSITORY_ROOT}/packages/react-native-worklets`),
        'packages/react-native-worklets'
      );
    });

    it('rejects the repository root and other directories', () => {
      assert.throws(
        () => packagePathFromCwd(REPOSITORY_ROOT),
        /yarn workspace/
      );
      assert.throws(
        () => packagePathFromCwd(`${REPOSITORY_ROOT}/apps/fabric-example`),
        /yarn workspace/
      );
    });
  });

  describe('isValidSlug', () => {
    it('accepts lowercase words joined with single dashes', () => {
      assert.equal(isValidSlug('css-transition-2'), true);
      assert.equal(isValidSlug('css--transition'), false);
      assert.equal(isValidSlug('@user/name'), false);
      assert.equal(isValidSlug(''), false);
    });
  });

  describe('parseFragment', () => {
    it('reads a one-line entry', () => {
      assert.deepEqual(parseFragment('Fix the `measure` crash.\n'), {
        fragment: { text: 'Fix the `measure` crash.' },
        errors: [],
      });
    });

    it('reads the `pr:` and `by:` lines', () => {
      assert.deepEqual(
        parseFragment('Fix a crash.\n\npr: 10584\nby: @first, @second-user\n'),
        {
          fragment: {
            text: 'Fix a crash.',
            pullRequest: 10584,
            authors: ['first', 'second-user'],
          },
          errors: [],
        }
      );
    });

    it('rejects an empty fragment', () => {
      assert.deepEqual(parseFragment(' \n\n').errors, [
        'The fragment is empty.',
      ]);
    });

    it('rejects a list marker', () => {
      assert.match(parseFragment('- Fix a crash.').errors[0], /list marker/);
    });

    it('rejects a second entry line', () => {
      assert.match(
        parseFragment('Fix a crash.\nFix one more.').errors[0],
        /one line/
      );
    });

    it('rejects a hand-made pull request link', () => {
      assert.match(
        parseFragment(
          'Fix a crash ([#1](https://github.com/o/r/pull/1) by [@u](https://github.com/u)).'
        ).errors[0],
        /pull request link/
      );
    });

    it('rejects a bare pull request number', () => {
      assert.match(
        parseFragment('Fix a crash (#123).').errors[0],
        /pull request link/
      );
    });

    it('rejects a bad `pr:` value, a bad handle and repeated lines', () => {
      assert.match(parseFragment('Fix.\npr: #12').errors[0], /number/);
      assert.match(parseFragment('Fix.\nby: user').errors[0], /handles/);
      assert.match(parseFragment('Fix.\npr: 1\npr: 2').errors[0], /more than/);
      assert.match(
        parseFragment('Fix.\nby: @a\nby: @b').errors[0],
        /more than/
      );
    });
  });
});
