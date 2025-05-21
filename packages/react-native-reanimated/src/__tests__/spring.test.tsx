import type { SpringAnimation } from '../animation/springUtils';
import { bisectRoot, scaleZetaToMatchClamps } from '../animation/springUtils';

describe('Spring utils', () => {
  test.each([
    [[0, 5, (x: number) => x - 3, 20], 3],
    [[0, 5, (x: number) => x * x - 9, 20], 3],
    [[0, 5, (x: number) => x * x - 2, 20], Math.sqrt(2)],
    [[0, 5, (x: number) => x - 1 / x - 1, 20], (1 + Math.sqrt(5)) / 2],
  ] as const)('Bisect root', (testCase, result) => {
    const [min, max, func, maxIterations] = testCase;
    const calculatedOutput = bisectRoot({
      min,
      max,
      func,
      maxIterations,
    });
    expect(calculatedOutput).toBeCloseTo(result);
  });

  const animation = {
    startValue: 0,
    toValue: 10,
    zeta: 0.5,
  } as SpringAnimation;

  test.each([
    { min: -1, max: 10 },
    { min: -100, max: 100 },
    { min: -40, max: 50 },
    { min: -0.005, max: 10.005 },
  ] as const)('Test scaleZetaToMatchClamps', (clamp) => {
    const zeta = scaleZetaToMatchClamps(animation, clamp);
    const extremum1 = Math.exp(-zeta * Math.PI);
    const extremum2 = Math.exp(-zeta * 2 * Math.PI);

    expect(extremum1).toBeLessThan(clamp.max);
    expect(extremum1).toBeGreaterThan(clamp.min);

    expect(extremum2).toBeLessThan(clamp.max);
    expect(extremum2).toBeGreaterThan(clamp.min);
  });
});
