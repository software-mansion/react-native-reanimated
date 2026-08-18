import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

// Every test here MUST fail. CI runs this suite and asserts the runner exits
// with a non-zero code, proving that a failing test actually fails the job.
describe('Intentional failures', () => {
  test('a failing numeric expectation is reported', () => {
    expect(1).toBe(2);
  });

  test('a failing string expectation is reported', () => {
    expect('ReJest').toBe('broken');
  });
});
