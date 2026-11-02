import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';

import type { LatestFromNpm } from '../validate-docs-released-versions.mts';
import {
  coversVersion,
  fetchLatestFromNpm,
  findLastVersion,
  latestChangelogVersion,
  validate,
} from '../validate-docs-released-versions.mts';

const RELEASED_DOCS = {
  'packages/react-native-reanimated/CHANGELOG.md':
    '# Changelog\n\n## 4.7.0 — 2026-09-18\n\n## 4.6.0 — 2026-08-01\n',
  'docs/docs-reanimated/versions.json': '["4.x", "3.x"]',
  'docs/docs-reanimated/docusaurus.config.js': "lastVersion: '4.x',",
  'packages/react-native-worklets/CHANGELOG.md':
    '# Changelog\n\n## 0.13.0 — 2026-09-18\n\n## 0.12.2 — 2026-08-20\n',
  'docs/docs-worklets/versions.json': '["0.13", "0.10-0.12", "0.9"]',
  'docs/docs-worklets/docusaurus.config.js': "lastVersion: '0.13',",
};

function run(
  overrides: Record<string, string>,
  npm: Record<string, LatestFromNpm> = {}
) {
  const files: Record<string, string> = { ...RELEASED_DOCS, ...overrides };
  return validate({
    readFile: (path) => {
      const content = files[path];
      assert.notEqual(content, undefined, `unexpected read of ${path}`);
      return content;
    },
    fetchLatest: async (name) => npm[name] ?? { error: 'offline' },
  });
}

describe('validate-docs-released-versions', () => {
  describe('coversVersion', () => {
    const version = { major: 0, minor: 11, patch: 3 };

    it('matches a minor label', () => {
      for (const per of ['major', 'minor'] as const) {
        assert.equal(coversVersion('0.11', version, per), true);
        assert.equal(coversVersion('0.12', version, per), false);
      }
    });

    it('matches a major label when the docs have a version per major', () => {
      assert.equal(coversVersion('0.x', version, 'major'), true);
      assert.equal(coversVersion('4.x', version, 'major'), false);
    });

    it('never matches a major label when the docs have a version per minor', () => {
      assert.equal(coversVersion('0.x', version, 'minor'), false);
    });

    it('matches a range label including both ends', () => {
      for (const per of ['major', 'minor'] as const) {
        assert.equal(coversVersion('0.10-0.12', version, per), true);
        assert.equal(coversVersion('0.11-0.12', version, per), true);
        assert.equal(coversVersion('0.9-0.11', version, per), true);
        assert.equal(coversVersion('0.12-0.13', version, per), false);
      }
    });

    it('never matches the current version', () => {
      assert.equal(coversVersion('current', version, 'major'), false);
    });
  });

  describe('latestChangelogVersion', () => {
    it('takes the highest stable heading', () => {
      assert.deepEqual(
        latestChangelogVersion(
          '## Unpublished\n\n## 5.0.0-rc.1\n\n## 4.7.1 — x\n\n## 4.10.0 — x\n'
        ),
        { major: 4, minor: 10, patch: 0 }
      );
    });

    it('gives nothing without a released heading', () => {
      assert.equal(
        latestChangelogVersion('# Changelog\n\n## Unpublished\n'),
        undefined
      );
    });
  });

  describe('findLastVersion', () => {
    it('reads lastVersion from the config', () => {
      assert.equal(findLastVersion("  lastVersion: '0.13',\n"), '0.13');
      assert.equal(findLastVersion('lastVersion: "4.x"'), '4.x');
      assert.equal(findLastVersion('versions: {}'), undefined);
    });

    it('skips commented-out lines', () => {
      assert.equal(
        findLastVersion(
          [
            "// lastVersion: '0.12',",
            "/* lastVersion: '0.11', */",
            '/*',
            " * lastVersion: '0.10',",
            ' */',
            "versions: {}, // lastVersion: '0.9',",
            "  lastVersion: '0.13',",
          ].join('\n')
        ),
        '0.13'
      );
      assert.equal(findLastVersion("// lastVersion: '0.12',"), undefined);
    });
  });

  describe('validate', () => {
    it('passes when every released minor has a docs version', async () => {
      const { problems } = await run(
        {},
        {
          'react-native-reanimated': { version: '4.7.1' },
          'react-native-worklets': { version: '0.13.1' },
        }
      );
      assert.deepEqual(problems, []);
    });

    it('fails when npm has a minor that is only Unreleased in the docs', async () => {
      const { problems } = await run(
        {},
        { 'react-native-worklets': { version: '0.14.0' } }
      );
      assert.equal(problems.length, 1);
      assert.match(
        problems[0],
        /react-native-worklets 0\.14\.0 \(npm `latest`\) is released, but docs\/docs-worklets\/versions\.json has no docs version/
      );
    });

    it('fails when the changelog has a minor that is only Unreleased in the docs', async () => {
      const { problems } = await run({
        'packages/react-native-worklets/CHANGELOG.md':
          '## 0.14.0 — 2026-11-01\n',
      });
      assert.equal(problems.length, 1);
      assert.match(
        problems[0],
        /0\.14\.0 \(packages\/react-native-worklets\/CHANGELOG\.md\)/
      );
    });

    it('fails when a new major is only Unreleased in the docs', async () => {
      const { problems } = await run(
        {},
        { 'react-native-reanimated': { version: '5.0.0' } }
      );
      assert.equal(problems.length, 1);
      assert.match(problems[0], /react-native-reanimated 5\.0\.0/);
    });

    it('fails when lastVersion does not cover the released minor', async () => {
      const { problems } = await run({
        'docs/docs-worklets/versions.json': '["0.14", "0.13"]',
        'packages/react-native-worklets/CHANGELOG.md':
          '## 0.14.0 — 2026-11-01\n',
      });
      assert.equal(problems.length, 1);
      assert.match(
        problems[0],
        /lastVersion .* is 0\.13, which does not cover it/
      );
    });

    it('fails when the older of the changelog and npm versions has no docs version', async () => {
      const { problems } = await run(
        {
          'packages/react-native-worklets/CHANGELOG.md':
            '## 0.14.0 — 2026-11-01\n',
          'docs/docs-worklets/versions.json': '["0.15", "0.13"]',
          'docs/docs-worklets/docusaurus.config.js': "lastVersion: '0.15',",
        },
        { 'react-native-worklets': { version: '0.15.0' } }
      );
      assert.equal(problems.length, 1);
      assert.match(
        problems[0],
        /react-native-worklets 0\.14\.0 \(packages\/react-native-worklets\/CHANGELOG\.md\) is released, but docs\/docs-worklets\/versions\.json has no docs version/
      );
    });

    it('checks lastVersion only against the newer of the changelog and npm versions', async () => {
      const { problems } = await run(
        {
          'packages/react-native-worklets/CHANGELOG.md':
            '## 0.14.0 — 2026-11-01\n',
          'docs/docs-worklets/versions.json': '["0.15", "0.14", "0.13"]',
          'docs/docs-worklets/docusaurus.config.js': "lastVersion: '0.15',",
        },
        { 'react-native-worklets': { version: '0.15.0' } }
      );
      assert.deepEqual(problems, []);
    });

    it('ignores a commented-out lastVersion', async () => {
      const { problems } = await run({
        'docs/docs-worklets/docusaurus.config.js':
          "// lastVersion: '0.13',\nlastVersion: 'current',",
      });
      assert.equal(problems.length, 1);
      assert.match(problems[0], /lastVersion .* is current/);
    });

    it('does not accept a major docs version for a Worklets minor', async () => {
      const { problems } = await run({
        'docs/docs-worklets/versions.json': '["0.x"]',
        'docs/docs-worklets/docusaurus.config.js': "lastVersion: '0.x',",
      });
      assert.equal(problems.length, 1);
      assert.match(
        problems[0],
        /react-native-worklets 0\.13\.0 .* has no docs version/
      );
    });

    it('fails when lastVersion is the Unreleased current version', async () => {
      const { problems } = await run({
        'docs/docs-worklets/docusaurus.config.js': "lastVersion: 'current',",
      });
      assert.equal(problems.length, 1);
      assert.match(problems[0], /lastVersion .* is current/);
    });

    it('uses the first docs version when the config has no lastVersion', async () => {
      const { problems } = await run({
        'docs/docs-worklets/docusaurus.config.js': 'versions: {}',
      });
      assert.deepEqual(problems, []);
    });

    it('ignores a prerelease on npm', async () => {
      const { problems } = await run(
        {},
        { 'react-native-worklets': { version: '0.14.0-rc.0' } }
      );
      assert.deepEqual(problems, []);
    });

    it('uses only the changelog when npm is not reachable', async () => {
      const { problems, messages } = await run({});
      assert.deepEqual(problems, []);
      assert.ok(
        messages.some((message) =>
          message.startsWith(
            'react-native-worklets: skipped the npm `latest` dist-tag'
          )
        )
      );
    });

    it('skips a package without any released version', async () => {
      const { problems, messages } = await run({
        'packages/react-native-worklets/CHANGELOG.md': '## Unpublished\n',
      });
      assert.deepEqual(problems, []);
      assert.ok(
        messages.includes(
          'react-native-worklets: found no released version, nothing to check.'
        )
      );
    });
  });

  describe('fetchLatestFromNpm', () => {
    it('reads the latest dist-tag', async () => {
      await withRegistry(
        200,
        { latest: '0.13.1', nightly: 'x' },
        async (url) => {
          assert.deepEqual(
            await fetchLatestFromNpm(url, 'react-native-worklets'),
            { version: '0.13.1' }
          );
        }
      );
    });

    it('gives an error for a failed response', async () => {
      await withRegistry(404, {}, async (url) => {
        assert.deepEqual(
          await fetchLatestFromNpm(url, 'react-native-worklets'),
          {
            error: 'the registry answered 404',
          }
        );
      });
    });

    it('gives an error when the registry is not reachable', async () => {
      const result = await fetchLatestFromNpm(
        'http://127.0.0.1:1',
        'react-native-worklets'
      );
      assert.ok('error' in result);
      assert.match(result.error, /^the registry is not reachable/);
    });
  });
});

async function withRegistry(
  status: number,
  body: object,
  test: (url: string) => Promise<void>
) {
  const server = createServer((request, response) => {
    assert.equal(request.url, '/-/package/react-native-worklets/dist-tags');
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await test(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}
