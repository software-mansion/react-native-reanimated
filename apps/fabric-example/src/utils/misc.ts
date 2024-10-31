/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { AnyRecord } from '@/types';

export const noop = () => {
  // Do nothing
};

export const getCodeWithOverrides = <C extends AnyRecord, O extends AnyRecord>(
  sharedConfig: C,
  overrides: Array<O> = [],
  excludeKeys: Array<string> = []
): string => {
  const propertyOverrides: AnyRecord = {};
  const excludeSet = new Set(excludeKeys);

  const isQuoted = (value: unknown) =>
    typeof value === 'string' && value[0] === '"' && value.slice(-1) === '"';

  const parseOverrideValue = (value: unknown) => {
    if (typeof value === 'string') {
      return JSON.stringify(value);
    }
    return value?.toString();
  };

  const parseOverride = (value: unknown) => {
    if (Array.isArray(value)) {
      return `[${value.map(parseOverrideValue).join(', ')}]`;
    }
    return parseOverrideValue(value);
  };

  for (const item of overrides) {
    for (const key in item) {
      if (!excludeSet.has(key)) {
        if (!propertyOverrides[key]) {
          propertyOverrides[key] = [];
        }
        propertyOverrides[key].push(parseOverride(item[key]));
      }
    }
  }

  return (
    '{\n  ' +
    [
      ...new Set([
        ...Object.keys(sharedConfig),
        ...Object.keys(propertyOverrides),
      ]),
    ]
      .map((key) => {
        const value = sharedConfig[key] ?? propertyOverrides[key]?.[0] ?? '';

        let parsedValue;
        if (typeof value === 'object' && value.toString) {
          const stringified = JSON.stringify(value, null, 2);
          parsedValue =
            JSON.parse(stringified) === stringified
              ? value.toString()
              : stringified;
        } else if (isQuoted(value)) {
          parsedValue = value;
        } else {
          parsedValue = JSON.stringify(value);
        }

        let line = `${key}: ${parsedValue}`;
        if (
          propertyOverrides[key] &&
          (propertyOverrides[key].length > 1 ||
            propertyOverrides[key][0] !== value)
        ) {
          line += ` // ${propertyOverrides[key].join(', ')}`;
        }
        return line;
      })
      .join('\n')
      .split('\n')
      .join('\n  ') +
    '\n}'
  );
};
