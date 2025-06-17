export function convertDecimalColor(color: unknown): string {
  'worklet';

  if (typeof color !== 'number') {
    console.log(`Invalid color ${color?.toString()} in snapshot`);
    return `${color?.toString()}`;
  }

  const posColor = color >= 0 ? color : 0xffffff & color;
  let hexColor = posColor.toString(16);

  while (hexColor.length < 6) {
    hexColor = '0' + hexColor;
  }
  while (hexColor.length < 8) {
    hexColor = 'f' + hexColor;
  }

  // color has now format #AA-RR-GG-BB, but we return #RR-GG-BB-AA, (A stands for alpha)

  return '#' + hexColor.slice(2) + hexColor.slice(0, 2);
}
