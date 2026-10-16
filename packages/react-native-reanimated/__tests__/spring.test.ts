import { withSpring } from '../src';

describe('withSpring', () => {
  test.each([
    { min: 10, max: 5 },
    { min: 5, max: 0 },
    { min: 0, max: -5 },
  ])('reports a clamp whose min $min is above its max $max', (clamp) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {
      // noop
    });

    withSpring(100, { duration: 300, clamp });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('clamp.min should be lower than clamp.max')
    );
    warn.mockRestore();
  });
});
