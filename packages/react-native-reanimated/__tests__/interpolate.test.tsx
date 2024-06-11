import { Extrapolation, interpolate } from '../src/interpolation';

describe('Test `interpolate` function', () => {
  describe('The provided range is ordered ([0,1] - ordered, [1,0] - unordered)', () => {
    describe('Interpolation within input range', () => {
      const BIG_NUM = 123456789.12345678;
      test.each([
        { value: -50, input: [-100, 100], output: [0, 100], expected: 25 },
        { value: -50, input: [-100, 100], output: [-200, 200], expected: -100 },
        { value: 50, input: [0, 100], output: [-100, 100], expected: 0 },
        { value: 25, input: [0, 100], output: [-100, 100], expected: -50 },
        { value: 75, input: [0, 100], output: [-100, 100], expected: 50 },
        { value: 50, input: [0, 100], output: [0, 1], expected: 0.5 },
        { value: 50e-10, input: [0, 100], output: [0, 1], expected: 0.5e-10 },
        { value: 50e-15, input: [0, 100], output: [0, 1], expected: 0.5e-15 },
        { value: 50, input: [0, 1e20], output: [0, 1], expected: 50e-20 },
        { value: 88, input: [50, 100], output: [150, 300], expected: 264 },
        { value: 200, input: [200, 300], output: [111, 200], expected: 111 },
        { value: 300, input: [200, 300], output: [100, 222], expected: 222 },
        {
          value: 22222,
          input: [11111, 33333],
          output: [44444, 55555],
          expected: 49999.5,
        },
        {
          value: 88,
          input: [50, 100],
          output: [BIG_NUM + 50, BIG_NUM + 100],
          expected: BIG_NUM + 88,
        },
        {
          value: BIG_NUM + 88,
          input: [BIG_NUM + 50, BIG_NUM + 100],
          output: [50, 100],
          expected: 88,
        },
        {
          value: 88,
          input: [50, 100],
          output: [2 * (BIG_NUM + 50), 2 * (BIG_NUM + 100)],
          expected: 2 * (BIG_NUM + 88),
        },
      ])(
        'Interpolate $value from $input to $output',
        ({ value, input, output, expected }) => {
          // Lets make sure that all these test cases contain number within range
          expect(value).toBeGreaterThanOrEqual(input[0]);
          expect(value).toBeLessThanOrEqual(input[1]);

          expect(interpolate(value, input, output)).toBe(expected);
          expect(interpolate(value, input, output, Extrapolation.CLAMP)).toBe(
            expected
          );
          expect(
            interpolate(value, input, output, Extrapolation.IDENTITY)
          ).toBe(expected);
          expect(interpolate(value, input, output, Extrapolation.EXTEND)).toBe(
            expected
          );
        }
      );
    });

    describe('Interpolation outside  input range', () => {
      test.each([
        {
          value: 50,
          input: [100, 200],
          output: [100, 200],
          expected: [100, 50, 50],
        },
        {
          value: 0,
          input: [200, 300],
          output: [100, 200],
          expected: [100, 0, -100],
        },
        {
          value: 50,
          input: [200, 300],
          output: [100, 200],
          expected: [100, 50, -50],
        },
        {
          value: 190,
          input: [200, 300],
          output: [100, 200],
          expected: [100, 190, 90],
        },

        {
          value: 400,
          input: [100, 200],
          output: [0, 100],
          expected: [100, 400, 300],
        },
      ])(
        'Interpolate $value from $input to $output',
        ({ value, input, output, expected }) => {
          const [clamp, identity, extend] = expected;

          if (value < input[0]) {
            // make sure we are below the range
            expect(value).toBeLessThan(input[0]);
          } else {
            // make sure we are above the range
            expect(value).toBeGreaterThan(input[1]);
          }

          expect(interpolate(value, input, output, Extrapolation.CLAMP)).toBe(
            clamp
          );
          expect(
            interpolate(value, input, output, Extrapolation.IDENTITY)
          ).toBe(identity);
          expect(interpolate(value, input, output, Extrapolation.EXTEND)).toBe(
            extend
          );
          expect(interpolate(value, input, output)).toBe(extend);
        }
      );
    });

    const PRECISION = 16;
    describe(`test precision up to ${PRECISION} digits`, () => {
      test.each([
        {
          value: 1234,
          input: [123, 12345],
          output: [12, 123],
          expected:
            // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
            22.090083456062837506136475208640157093765341188021600392734413352,
        },
      ])(
        'Interpolate value $value from $input to $output',
        ({ value, input, output, expected }) => {
          const applyPrecision = (x: number) => {
            return Number(x.toPrecision(PRECISION));
          };

          expect(
            applyPrecision(interpolate(applyPrecision(value), input, output))
          ).toBe(applyPrecision(expected));
        }
      );
    });
  });

  describe('At least one of the provided ranges is unordered', () => {
    describe('Interpolation within input range', () => {
      test.each([
        {
          value: 100,
          input: [200, 0],
          output: [100, 200],
          expected: 150,
        },
        {
          value: 150,
          input: [200, 0],
          output: [100, 200],
          expected: 125,
        },
      ])(
        'Interpolate $value from $input to $output',
        ({ value, input, output, expected }) => {
          expect(interpolate(value, input, output, Extrapolation.CLAMP)).toBe(
            expected
          );
          expect(
            interpolate(value, input, output, Extrapolation.IDENTITY)
          ).toBe(expected);
          expect(interpolate(value, input, output, Extrapolation.EXTEND)).toBe(
            expected
          );
          expect(interpolate(value, input, output)).toBe(expected);
        }
      );
    });

    describe('Interpolation outside input range', () => {
      test.each([
        {
          value: 300,
          input: [200, 0],
          output: [100, 200],
          expected: [100, 300, 50],
        },
        {
          value: -200,
          input: [200, 0],
          output: [100, 200],
          expected: [200, -200, 300],
        },
        {
          value: -200,
          input: [200, 0],
          output: [400, 200],
          expected: [200, -200, 0],
        },
        {
          value: -200,
          input: [200, 0],
          output: [0, 200],
          expected: [200, -200, 400],
        },
        {
          value: -200,
          input: [0, 100],
          output: [200, 0],
          expected: [200, -200, 600],
        },
        {
          value: 200,
          input: [0, 100],
          output: [200, 0],
          expected: [0, 200, -200],
        },
      ])(
        'Interpolate $value from $input to $output',
        ({ value, input, output, expected }) => {
          const [clamp, identity, extend] = expected;

          expect(interpolate(value, input, output, Extrapolation.CLAMP)).toBe(
            clamp
          );
          expect(
            interpolate(value, input, output, Extrapolation.IDENTITY)
          ).toBe(identity);
          expect(interpolate(value, input, output, Extrapolation.EXTEND)).toBe(
            extend
          );
          expect(interpolate(value, input, output)).toBe(extend);
        }
      );
    });
  });
});
