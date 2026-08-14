import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findMissingChangelogs } from '../check-changelog.mts';

describe('check-changelog', () => {
  it('requires the Reanimated changelog for Reanimated changes', () => {
    assert.deepEqual(
      findMissingChangelogs(['packages/react-native-reanimated/src/index.ts']),
      ['packages/react-native-reanimated/CHANGELOG.md']
    );
  });

  it('requires the Worklets changelog for Worklets changes', () => {
    assert.deepEqual(
      findMissingChangelogs([
        'packages/react-native-worklets/plugin/src/index.ts',
      ]),
      ['packages/react-native-worklets/CHANGELOG.md']
    );
  });

  it('requires both changelogs when both packages change', () => {
    assert.deepEqual(
      findMissingChangelogs([
        'packages/react-native-reanimated/src/index.ts',
        'packages/react-native-worklets/src/index.ts',
      ]),
      [
        'packages/react-native-reanimated/CHANGELOG.md',
        'packages/react-native-worklets/CHANGELOG.md',
      ]
    );
  });

  it('accepts a changelog update for each changed package', () => {
    assert.deepEqual(
      findMissingChangelogs([
        'packages/react-native-reanimated/src/index.ts',
        'packages/react-native-reanimated/CHANGELOG.md',
        'packages/react-native-worklets/src/index.ts',
        'packages/react-native-worklets/CHANGELOG.md',
      ]),
      []
    );
  });

  it('temporarily exempts Reanimated 4.6.0-main', () => {
    assert.deepEqual(
      findMissingChangelogs(
        ['packages/react-native-reanimated/src/index.ts'],
        new Map([['packages/react-native-reanimated', '4.6.0-main']])
      ),
      []
    );
  });

  it('temporarily exempts Worklets 0.12.0-main', () => {
    assert.deepEqual(
      findMissingChangelogs(
        ['packages/react-native-worklets/src/index.ts'],
        new Map([['packages/react-native-worklets', '0.12.0-main']])
      ),
      []
    );
  });

  it('enables enforcement after both package versions change', () => {
    assert.deepEqual(
      findMissingChangelogs(
        [
          'packages/react-native-reanimated/src/index.ts',
          'packages/react-native-worklets/src/index.ts',
        ],
        new Map([
          ['packages/react-native-reanimated', '4.7.0-main'],
          ['packages/react-native-worklets', '0.13.0-main'],
        ])
      ),
      [
        'packages/react-native-reanimated/CHANGELOG.md',
        'packages/react-native-worklets/CHANGELOG.md',
      ]
    );
  });

  it('keeps enforcement package-specific', () => {
    assert.deepEqual(
      findMissingChangelogs(
        [
          'packages/react-native-reanimated/src/index.ts',
          'packages/react-native-worklets/src/index.ts',
        ],
        new Map([
          ['packages/react-native-reanimated', '4.6.0-main'],
          ['packages/react-native-worklets', '0.13.0-main'],
        ])
      ),
      ['packages/react-native-worklets/CHANGELOG.md']
    );
  });

  it('ignores changes outside the two published packages', () => {
    assert.deepEqual(
      findMissingChangelogs([
        'docs/docs-reanimated/docs/fundamentals/getting-started.mdx',
        'apps/common-app/src/App.tsx',
      ]),
      []
    );
  });
});
