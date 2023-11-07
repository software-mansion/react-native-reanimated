interface RecognizedPrefixSuffix {
  prefix?: string;
  suffix?: string;
  strippedValue: number;
}

export function recognizePrefixSuffix(
  value: string | number
): RecognizedPrefixSuffix {
  'worklet';
  if (typeof value === 'number') {
    return { strippedValue: value };
  }

  const match = value.match(
    /([A-Za-z]*)(-?\d*\.?\d*)([eE][-+]?[0-9]+)?([A-Za-z%]*)/
  );
  if (!match) {
    throw new Error(`[Reanimated] Couldn't parse animation value ${value}.`);
  }
  const prefix = match[1];
  const suffix = match[4];
  // number with scientific notation
  const number = match[2] + (match[3] ?? '');
  return { prefix, suffix, strippedValue: parseFloat(number) };
}
