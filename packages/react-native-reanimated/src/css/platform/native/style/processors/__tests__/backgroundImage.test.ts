import { parseCssFunction } from '../backgroundImage';

describe(parseCssFunction, () => {
  it('should parse linear-gradient', () => {
    expect(
      parseCssFunction('linear-gradient(to right, red, orange, yellow)')
    ).toEqual({
      name: 'linear-gradient',
      params: ['to right', 'red', 'orange', 'yellow'],
    });
  });
});
