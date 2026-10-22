import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { describe, it } from 'node:test';

import { transformSync as babelTransform } from '@babel/core';
import { transformSync as esbuildTransform } from 'esbuild';
import { globSync } from 'glob';

import { formatLogs, simulate } from '../index';
import type { SnippetModule } from '../types';

const ROOT = join(__dirname, '..', '..', '..');
const pinSnippetNames = require('../snippetNamesLoader.js');
const files = globSync(
  [
    'docs/{threading,memory,utility}/_examples/*.js',
    'docs/concepts/_closures/*.js',
    'docs/tutorials/_using-event-loop/*.js',
    'docs/tutorials/_your-first-worklet/createWorker.js',
    'docs/tutorials/_synchronizing-data/syncGlobal.js',
  ],
  { cwd: ROOT, absolute: true }
).sort();

describe('snippets compiled with the docs Babel configuration', () => {
  for (const envName of ['development', 'production']) {
    for (const file of files) {
      it(`${envName}: ${basename(file)} retains its simulated behavior`, () => {
        const source = readFileSync(file, 'utf8');
        const transformed = babelTransform(pinSnippetNames(source), {
          filename: file,
          cwd: ROOT,
          configFile: join(ROOT, 'babel.config.js'),
          envName,
          caller: {
            name: 'babel-loader',
            supportsStaticESM: true,
            supportsDynamicImport: true,
          },
        })!.code!;
        // These run in the simulator, never in a native Worklet Runtime.
        // Workletization injects browser-global debug helpers and closure
        // factories that can conflict with the simulated globals and frames.
        assert.doesNotMatch(transformed, /__workletHash|__stackDetails/);
        const code = esbuildTransform(transformed, { format: 'cjs' }).code;
        const compiled = { exports: {} };
        new Function('require', 'module', 'exports', code)(
          createRequire(file),
          compiled,
          compiled.exports
        );
        const snapshots = simulate(compiled.exports as SnippetModule, source, {
          durationTicks: 300,
        });
        assert.deepEqual(
          snapshots.flatMap((snapshot) =>
            snapshot.events.filter((event) => event.type === 'error')
          ),
          []
        );
        const reference = simulate(require(file), source, {
          durationTicks: 300,
        });
        assert.deepEqual(formatLogs(snapshots), formatLogs(reference));
        assert.deepEqual(snapshots.at(-1)!.memory, reference.at(-1)!.memory);
        assert.deepEqual(
          snapshots.at(-1)!.cores.map((core) => core.globals),
          reference.at(-1)!.cores.map((core) => core.globals)
        );
      });
    }

    it(`${envName}: interactive examples still receive the Worklets transform`, () => {
      const file = join(ROOT, 'src/examples/ScheduleOnRN.tsx');
      const transformed = babelTransform(readFileSync(file, 'utf8'), {
        filename: file,
        cwd: ROOT,
        configFile: join(ROOT, 'babel.config.js'),
        envName,
      })!.code!;
      assert.match(transformed, /__workletHash/);
    });
  }
});
