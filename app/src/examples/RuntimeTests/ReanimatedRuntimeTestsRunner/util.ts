/** On Android the color passed to _updatePropsPaper is a decimal, making HEX color after conversion into two's complement */
export function convertNegativeNumericColor(color: unknown): string {
  'worklet';

  if (typeof color !== 'number') {
    console.log(`Invalid color ${color} in snapshot`);
    return `${color}`;
  }

  var size = 8;

  if (color >= 0) {
    var hexadecimal = color.toString(16);

    while (hexadecimal.length % size !== 0) {
      hexadecimal = '' + 0 + hexadecimal;
    }

    return hexadecimal;
  } else {
    var hexadecimal = Math.abs(color).toString(16);
    while (hexadecimal.length % size !== 0) {
      hexadecimal = '' + 0 + hexadecimal;
    }

    var output = '';
    for (let i = 0; i < hexadecimal.length; i++) {
      output += (0x0f - parseInt(hexadecimal[i], 16)).toString(16);
    }

    output = (0x01 + parseInt(output, 16)).toString(16);

    return '#' + output.slice(2) + output.slice(0, 2);
  }
}
