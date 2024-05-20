import { Bezier } from '../src/reanimated2/Bezier';

/*
 * https://github.com/gre/bezier-easing/blob/master/test/test.js
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

function repeat(n: number) {
  return (f: () => void) => {
    for (let i = 0; i < n; ++i) f();
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
    let allTestPass = true;
    repeat(1000)(() => {
      const a = Math.random();
      const b = Math.random();

      const easing = Bezier(a, a, b, b);

      if (!functionsAreEqual(easing, (x: number) => x)) {
        allTestPass = false;
        test(`Bezier(${a},${a}, ${b}, ${b}) is linear`, () => {
          expect(false).toBeTruthy();
        });
      }
    });
    test('All monkey tests pass', () => {
      expect(allTestPass).toBeTruthy();
    });
  });

  describe('Should satisfy that bezier(0) = 0 and bezier(1)=1', () => {
    let allTestPass = true;
    repeat(1000)(() => {
      const a = Math.random();
      const b = 3 * Math.random() - 1;
      const c = Math.random();
      const d = 3 * Math.random() - 1;

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
    test('All monkey tests pass', () => {
      expect(allTestPass).toBeTruthy();
    });
  });

  describe('Composite of a bezier curve and its reflection relative to line f(x)=x is close to identity', () => {
    // The b1 = bezier(a,b,c,d) curve is defined through four points: (0,0), (a,b), (c,d) and (1,1)
    // The b2 = bezier(b,a,d,c) curve is defined through four points: (0,0), (b,a), (d,c) and (1,1)
    // These two bezier curves are each others reflection relative to line f(x)=x
    // So if b1(x) = y, then b2(y) = x and b2(b1(x)) = x

    let allTestPass = true;
    repeat(1000)(() => {
      const a = Math.random();
      const b = Math.random();
      const c = Math.random();
      const d = Math.random();

      const easing1 = Bezier(a, b, c, d);
      const easing2 = Bezier(b, a, d, c);

      const almostIdentity = (x: number) => easing1(easing2(x));
      if (!functionsAreEqual(almostIdentity, (x: number) => x, 0.001)) {
        allTestPass = false;
        test(`Bezier(${a},${b}, ${c}, ${d}) is symmetric to its reflection about the axis f(x)=x`, () => {
          expect(false).toBeTruthy();
        });
      }
    });
    test('All monkey tests pass', () => {
      expect(allTestPass).toBeTruthy();
    });
  });

  describe('Bezier(a,b,(1-a),(1-b)) should have point symmetry at point (0.5, 0.5)', () => {});
});
