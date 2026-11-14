import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { PLATFORM_DEFINITIONS } from '../definitions.mts';
import type { PlatformDefinition } from '../platform.mts';
import { metricDefinitionsTable } from '../report.mts';
import { METRICS as ANDROID_TRACE_METRICS } from './command-fake.mts';
import { IOS_TRACE_METRICS } from './ios-fixtures.mts';

const README = fs.readFileSync(
  path.join(import.meta.dirname, '..', 'README.md'),
  'utf8'
);
const STORED_METRICS = {
  android: [...Object.keys(ANDROID_TRACE_METRICS), 'coldStart'],
  ios: [...Object.keys(IOS_TRACE_METRICS), 'coldStart'],
};

describe('platform definitions', () => {
  for (const definition of Object.values(PLATFORM_DEFINITIONS)) {
    describe(definition.name, () => {
      it('gives the README the metric table of the definitions', () => {
        assert.ok(
          README.includes(metricDefinitionsTable(definition)),
          `apps/benchmark-app/scripts/README.md has no current metric table of ${definition.name}`
        );
      });

      it('defines each stored metric one time', () => {
        const names = definition.metricDefinitions.flatMap(
          (entry) => entry.names
        );
        assert.deepEqual(
          [...names].sort(),
          [...STORED_METRICS[definition.name]].sort()
        );
      });

      it('gives one role to all names of a row', () => {
        for (const entry of definition.metricDefinitions) {
          const roles = new Set(
            entry.names.map((name) => roleOf(definition, name))
          );
          assert.equal(roles.size, 1, entry.names.join(', '));
        }
      });

      it('does not give a metric a verdict and an advisory role', () => {
        assert.ok(
          definition.advisoryMetrics.every(
            (metric) => !definition.verdictMetrics.includes(metric)
          )
        );
      });
    });
  }
});

function roleOf(definition: PlatformDefinition, name: string): string {
  if ((definition.verdictMetrics as readonly string[]).includes(name)) {
    return 'verdict';
  }
  return (definition.advisoryMetrics as readonly string[]).includes(name)
    ? 'advisory'
    : 'stored';
}
