import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { reloadRepeatsSuites, selectSuites } from '../runtime-tests-suites.mts';

const SUITES = [
  { name: 'A' },
  { name: 'B', skipByDefault: true },
  { name: 'C', disabled: true },
  { name: 'D' },
];

describe('selectSuites', () => {
  it('skips suites that are skipped by default or disabled', () => {
    assert.deepEqual(selectSuites(SUITES, null), ['A', 'D']);
  });

  it('keeps only the requested suites in declaration order', () => {
    assert.deepEqual(selectSuites(SUITES, ['D', 'B', 'A']), ['A', 'B', 'D']);
  });
});

describe('reloadRepeatsSuites', () => {
  const selected = ['A', 'B', 'C'];

  it('accepts the first reload of the run', () => {
    assert.equal(reloadRepeatsSuites(selected, null, 'A'), false);
  });

  it('accepts a reload that resumes from a later suite', () => {
    assert.equal(reloadRepeatsSuites(selected, 'B', 'C'), false);
  });

  it('rejects a second reload that resumes from the same suite', () => {
    assert.equal(reloadRepeatsSuites(selected, 'B', 'B'), true);
  });

  it('rejects a reload that resumes from an earlier suite', () => {
    assert.equal(reloadRepeatsSuites(selected, 'B', 'A'), true);
  });

  it('leaves a suite that was not selected to the resume check', () => {
    assert.equal(reloadRepeatsSuites(selected, 'B', 'X'), false);
  });
});
