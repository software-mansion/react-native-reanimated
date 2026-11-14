import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  SCENARIOS,
  SCENARIO_REQUIREMENTS,
  VALIDATION_SCENARIOS,
} from '../scenarios.mts';

const SCENARIO_SOURCES = path.join(
  import.meta.dirname,
  '..',
  '..',
  'src',
  'scenarios'
);
const REGISTRY = path.join(SCENARIO_SOURCES, 'registry.ts');

const VALIDATION_REGISTRY = path.join(
  SCENARIO_SOURCES,
  'validationRegistry.ts'
);

function registryNames(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  return [...source.matchAll(/\bname: '([^']+)'/g)].map((match) => match[1]);
}

describe('SCENARIOS', () => {
  it('lists the scenario names of the app registry in the same order', () => {
    assert.deepEqual(registryNames(REGISTRY), [...SCENARIOS]);
  });

  it('lists the validation scenario names of the app in the same order', () => {
    assert.deepEqual(registryNames(VALIDATION_REGISTRY), [
      ...VALIDATION_SCENARIOS,
    ]);
  });
});

describe('SCENARIO_REQUIREMENTS', () => {
  it('gives idle-cost the update share of its source: one update for each FRAMES_PER_UPDATE frames', () => {
    const source = fs.readFileSync(
      path.join(SCENARIO_SOURCES, 'IdleCost.tsx'),
      'utf8'
    );
    const framesPerUpdate = Number(
      /const FRAMES_PER_UPDATE = (\d+);/.exec(source)?.[1]
    );
    assert.equal(
      SCENARIO_REQUIREMENTS['idle-cost'].updateShare,
      1 / framesPerUpdate
    );
  });

  it('gives each other scenario an update on each refresh', () => {
    for (const scenario of SCENARIOS.filter((name) => name !== 'idle-cost')) {
      assert.equal(SCENARIO_REQUIREMENTS[scenario].updateShare, 1, scenario);
    }
  });

  it('declares the static flags that the scenario sources read', () => {
    const flagsOf = (file: string) =>
      [
        ...fs
          .readFileSync(path.join(SCENARIO_SOURCES, file), 'utf8')
          .matchAll(/getStaticFeatureFlag\('([A-Z_]+)'\)/g),
      ].map((match) => match[1]);
    const read = fs
      .readdirSync(SCENARIO_SOURCES)
      .filter((file) => file.endsWith('.tsx'))
      .flatMap(flagsOf);
    assert.deepEqual(
      [...new Set(read)].sort(),
      [
        ...new Set(
          SCENARIOS.flatMap(
            (scenario) => SCENARIO_REQUIREMENTS[scenario].reanimatedFlags
          )
        ),
      ].sort()
    );
    assert.deepEqual(SCENARIO_REQUIREMENTS['shared-elements'].reanimatedFlags, [
      ...new Set(flagsOf('SharedElements.tsx')),
    ]);
  });
});
