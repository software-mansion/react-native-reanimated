import { Bezier } from '../src/reanimated2/Bezier';

/*
 * https://github.com/gre/bezier-easing/blob/master/test/test.js
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

function repeat(n: number) {
  return function (f: () => void) {
    for (let i = 0; i < n; ++i) f();
  };
}

function functionsAreEqual(
  fun1: (x: number) => number,
  fun2: (x: number) => number
) {
  let allPointsAreEqual = true;

  const points = Array.from(Array(100).keys()).map((x) => x / 100);
  points.forEach((point) => {
    if (fun1(point) !== fun2(point)) {
      allPointsAreEqual = false;
    }
  });
  return allPointsAreEqual;
}

describe('Test `Bezier` function', () => {
  it('Should be a function', function () {
    expect(typeof Bezier === 'function').toBeTruthy();
  });
  it('Should create a function', function () {
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
    repeat(1000)(function () {
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

  describe('Should satisfy that bezier(0) = 0 and bezier(1)=1', function () {
    let allTestPass = true;
    repeat(1000)(function () {
      const a = Math.random();
      const b = 2 * Math.random() - 0.5;
      const c = Math.random();
      const d = 2 * Math.random() - 0.5;

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
});
