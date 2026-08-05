import { processColor } from 'react-native';

export function isColor(value: unknown): value is string {
  return typeof value === 'string' && parseColor(value) != null;
}

export function processColorNumber(value: string): number {
  return (parseColor(value) as number) ?? 0;
}

function parseColor(value: string) {
  const parsed = processColor(value);
  if (parsed == null && value.startsWith('hwb(')) {
    return processColor(value.replace(/,/g, ' '));
  }
  return parsed;
}

export function colorsAreClose(expected: string, value: string): boolean {
  const expectedChannels = colorChannels(expected);
  const valueChannels = colorChannels(value);
  return expectedChannels.every(
    (channel, index) => Math.abs(channel - valueChannels[index]) <= 1
  );
}

function colorChannels(value: string): number[] {
  /* eslint-disable no-bitwise */
  const color = processColorNumber(value) >>> 0;
  return [
    color >>> 24,
    (color >>> 16) & 0xff,
    (color >>> 8) & 0xff,
    color & 0xff,
  ];
  /* eslint-enable no-bitwise */
}
