import { Bezier } from '../src/Bezier';

// spell-checker:disable
/*
 * https://github.com/gre/bezier-easing/blob/master/test/test.js
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */
// spell-checker:enable

function splitMix32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x9e3779b9) | 0;
    let t = seed ^ (seed >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

function getSeededRandom(seed: number) {
  return splitMix32(seed);
}

const seededRandom = getSeededRandom(2);
function repeat(n: number) {
  return (f: () => void) => {
    for (let i = 0; i < n; ++i) {
      f();
    }
  };
}

function functionsAreEqual(
  fun1: (x: number) => number,
  fun2: (x: number) => number,
  maxError = 0
) {
  let allPointsAreEqual = true;

  const points = Array.from(Array(100).keys()).map((x) => x / 100);
  points.forEach((point) => {
    if (Math.abs(fun1(point) - fun2(point)) > maxError) {
      allPointsAreEqual = false;
    }
  });
  return allPointsAreEqual;
}

describe('Test `Bezier` function', () => {
  it('Should be a function', () => {
    expect(typeof Bezier === 'function').toBeTruthy();
  });
  it('Should create a function', () => {
    expect(typeof Bezier(0, 0, 1, 1) === 'function').toBeTruthy();
    expect(typeof Bezier(0, 0, 1, 1)(0.5) === 'number').toBeTruthy();
  });

  describe('Function throws error in case of incorrect arguments', () => {
    test.each([
      [0.5, 0.5, -5, 0.5],
      [0, 0.5, -0.005, 0.5],
      [0.5, 0.5, 5, 0.5],
      [-2, 0.5, 0.5, 0.5],
      [2, 0.5, 0.5, 0.5],
    ])(
      'Invalid arguments point1 = (%d, %d) point2 = (%d, %d), x should be in range [0,1]',
      (x1, x2, y1, y2) => {
        expect(() => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _func = Bezier(x1, x2, y1, y2);
        }).toThrow();
      }
    );

    test.each([
      [0, 0, 1, 1],
      [0.5, 100, 0.5, 50],
      [0.5, -100, 0.5, 50],
      [0.5, 0, 0.5, -50],
      [1, 0, 0.5, -50],
    ])(
      'Valid arguments point1 = (%d, %d) point2 = (%d, %d)',
      (x1, x2, y1, y2) => {
        expect(() => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _func = Bezier(x1, x2, y1, y2);
        }).not.toThrow();
      }
    );
  });

  describe('Function bezier(a,a,b,b) is alway linear', () => {
    test.each([
      [0.0000001, 0.0000001, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 1, 1],
      [1, 1, 0, 0],
      [1, 1, 1, 1],
    ])(`Bezier(%d,%d,%d,%d)`, (a, b, c, d) => {
      expect(functionsAreEqual(Bezier(a, b, c, d), (x) => x)).toBeTruthy();
    });

    const MONKEY_TRIES = 1000;
    let allTestPass = true;
    repeat(MONKEY_TRIES)(() => {
      const a = seededRandom();
      const b = seededRandom();

      const easing = Bezier(a, a, b, b);

      if (!functionsAreEqual(easing, (x: number) => x)) {
        allTestPass = false;
        test(`Bezier(${a},${a}, ${b}, ${b}) is linear`, () => {
          expect(false).toBeTruthy();
        });
      }
    });
    test(`All ${MONKEY_TRIES} monkey tests pass`, () => {
      expect(allTestPass).toBeTruthy();
    });
  });

  describe('Should satisfy that bezier(0) = 0 and bezier(1)=1', () => {
    test.each([
      [0.0000001, 0.0000001, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 1, 1000000],
      [1, 1000000, 0, 1000000],
      [1, 1, 1, -1000000],
      [1, -1000000, 1, -1000000],
      [1, -1000000, 1, 0],
    ])(`Bezier(%d,%d,%d,%d)`, (a, b, c, d) => {
      expect(Bezier(a, b, c, d)(0)).toBe(0);
      expect(Bezier(a, b, c, d)(1)).toBe(1);
    });

    const MONKEY_TRIES = 1000;
    let allTestPass = true;
    repeat(MONKEY_TRIES)(() => {
      const a = seededRandom();
      const b = 3 * seededRandom() - 1;
      const c = seededRandom();
      const d = 3 * seededRandom() - 1;
      const easing = Bezier(a, b, c, d);

      const satisfiesCondition = easing(0) === 0 && easing(1) === 1;
      if (!satisfiesCondition) {
        allTestPass = false;
        test(`Bezier(${a},${b}, ${c}, ${d})(0) = 0 \n Bezier(${a},${b}, ${c}, ${d})(1) = 1`, () => {
          expect(easing(0)).toBe(0);
          expect(easing(1)).toBe(1);
        });
      }
    });
    test(`All ${MONKEY_TRIES} monkey tests pass`, () => {
      expect(allTestPass).toBeTruthy();
    });
  });

  describe('Bezier(a,b,c,d) and Bezier(b,a,d,c) are symmetric about the axis f(x)=x', () => {
    // The b1 = bezier(a,b,c,d) curve is defined through four points: (0,0), (a,b), (c,d) and (1,1)
    // The b2 = bezier(b,a,d,c) curve is defined through four points: (0,0), (b,a), (d,c) and (1,1)
    // These two bezier curves are each others reflection relative to line f(x)=x
    // So if b1(x) = y, then b2(y) = x and b2(b1(x)) = x

    test.each([
      [0.0000001, 0, 0.0000001, 0, 0.00000001],
      [0.0000001, 0, 0.005, 0, 0.00000001],
      [0.1, 0.2, 0.05, 0.7, 0.00000001],
      [0.98, 0.45, 0.05, 0.17, 0.00000001],
      [0.98, 0.45, 0.85, 0.17, 0.00000001],

      // Precision drop when c gets close to one (same drop when d gets close to one due to symmetry)
      // may be worth to investigate it in the future
      [0.98, 0.45, 0.9, 0.17, 0.00000001],
      [0.98, 0.45, 0.99, 0.17, 0.00000001],
      [0.98, 0.45, 0.999, 0.17, 0.000001],
      [0.98, 0.45, 0.9999, 0.17, 0.01],
      [0.98, 0.45, 1, 0.17, 0.01],

      // Precision drop when a gets close to zero (same drop when b gets close to one due to symmetry)
      [0.99, 0.45, 0.85, 0.17, 0.00000001],
      [0.99, 0.45, 0.85, 0.17, 0.00000001],
      [0.999, 0.45, 0.85, 0.17, 0.00000001],
      [0.9999, 0.45, 0.85, 0.17, 0.00000001],
      [0.99999, 0.45, 1, 0.85, 0.01],
      [1, 0.45, 1, 0.85, 0.01],

      [0, 0, 1, 0, 0.01],
      [1, 1, 0, 1, 0.1],
      [0, 1, 0, 1, 0.1],
    ])(`Bezier(%d,%d,%d,%d)`, (a, b, c, d, precision) => {
      const easing1 = Bezier(a, b, c, d);
      const easing2 = Bezier(b, a, d, c);
      expect(
        functionsAreEqual(
          (x) => easing1(easing2(x)),
          (x: number) => x,
          precision
        )
      ).toBeTruthy();
    });

    const MONKEY_TRIES = 20000;
    const PRECISION_0 = 0.02;
    let allTestPass0 = true;
    repeat(MONKEY_TRIES)(() => {
      const a = seededRandom();
      const b = seededRandom();
      const c = seededRandom();
      const d = seededRandom();

      const easing1 = Bezier(a, b, c, d);
      const easing2 = Bezier(b, a, d, c);

      const almostIdentity = (x: number) => easing1(easing2(x));
      if (!functionsAreEqual(almostIdentity, (x: number) => x, PRECISION_0)) {
        allTestPass0 = false;
        test(`Bezier(${a},${b}, ${c}, ${d}) is symmetric to its reflection about the axis f(x)=x`, () => {
          expect(false).toBeTruthy();
        });
      }
    });
    test(`All ${MONKEY_TRIES} monkey tests for random a,b,c,d in [0,1] pass, precision=${PRECISION_0}`, () => {
      expect(allTestPass0).toBeTruthy();
    });

    const PRECISION_1 = 1e-12;
    let allTestPass1 = true;
    repeat(MONKEY_TRIES)(() => {
      const a = 0.9 * seededRandom() + 0.05;
      const b = 0.9 * seededRandom() + 0.05;
      const c = 0.9 * seededRandom() + 0.05;
      const d = 0.9 * seededRandom() + 0.05;

      const easing1 = Bezier(a, b, c, d);
      const easing2 = Bezier(b, a, d, c);

      const almostIdentity = (x: number) => easing1(easing2(x));
      if (!functionsAreEqual(almostIdentity, (x: number) => x, PRECISION_1)) {
        allTestPass1 = false;
        test(`Bezier(${a},${b}, ${c}, ${d}) is symmetric to its reflection about the axis f(x)=x`, () => {
          expect(false).toBeTruthy();
        });
      }
    });
    test(`All ${MONKEY_TRIES} monkey tests for random a,b,c,d in [0.05,0.95] pass, precision=${PRECISION_1}`, () => {
      expect(allTestPass1).toBeTruthy();
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  describe('Bezier(a,b,(1-a),(1-b)) should have point symmetry at point (0.5, 0.5)', () => {});
});
