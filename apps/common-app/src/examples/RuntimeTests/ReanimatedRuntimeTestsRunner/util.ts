export function convertDecimalColor(color: unknown): string {
  'worklet';

  if (typeof color !== 'number') {
    console.log(`Invalid color ${color?.toString()} in snapshot`);
    return `${color?.toString()}`;
  }

  const size = 8;
  let hexColor = '';

  if (color >= 0) {
    hexColor = color.toString(16);

    while (hexColor.length % size !== 0) {
      hexColor = '' + 0 + hexColor;
    }
  } else {
    let hexadecimal = Math.abs(color).toString(16);
    while (hexColor.length % size !== 0) {
      hexadecimal = '' + 0 + hexadecimal;
    }

    hexColor = '';
    for (let i = 0; i < hexColor.length; i++) {
      hexColor += (0x0f - parseInt(hexColor[i], 16)).toString(16);
    }

    hexColor = (0x01 + parseInt(hexColor, 16)).toString(16);
  }
  return '#' + hexColor.slice(2) + hexColor.slice(0, 2);
}
