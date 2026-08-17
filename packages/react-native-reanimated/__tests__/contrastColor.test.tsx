import { contrastColor } from '../src/Colors';

describe('contrastColor', () => {
  test.each([
    ['black', 'white'],
    ['white', 'black'],
    ['#000000', 'white'],
    ['#757575', 'white'],
    ['#767676', 'black'],
    ['#ffffff', 'black'],
    ['#ff0000', 'black'],
    ['#00ff00', 'black'],
    ['#0000ff', 'white'],
    ['yellow', 'black'],
    ['cyan', 'black'],
    ['magenta', 'black'],
    ['rgb(255, 0, 0)', 'black'],
    ['rgba(255, 0, 0, 1)', 'black'],
    ['hsl(0, 100%, 50%)', 'black'],
    [0x000000ff, 'white'],
  ])('contrastColor(%p) === %p', (input, expected) => {
    expect(contrastColor(input)).toBe(expected);
  });
});
