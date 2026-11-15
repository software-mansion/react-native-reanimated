import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLATFORM_DEFINITIONS } from '../definitions.mts';
import type { PlatformDefinition } from '../platform.mts';
import { METRICS as ANDROID_TRACE_METRICS } from './command-fake.mts';
import { IOS_SAMPLE_METRICS } from './ios-fixtures.mts';

const STORED_METRICS = {
  android: [...Object.keys(ANDROID_TRACE_METRICS), 'coldStart'],
  ios: [...Object.keys(IOS_SAMPLE_METRICS), 'coldStart'],
};

describe('platform definitions', () => {
  it('gives each platform the revision of its last measurement change', () => {
    assert.equal(PLATFORM_DEFINITIONS.android.measurementRevision, 2);
    assert.equal(PLATFORM_DEFINITIONS.ios.measurementRevision, 6);
  });

  for (const definition of Object.values(PLATFORM_DEFINITIONS)) {
    describe(definition.name, () => {
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
