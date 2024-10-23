import type { AnyRecord } from '../types';

export const noop = () => {
  // Do nothing
};

export const getCodeWithOverrides = <C extends AnyRecord, O extends AnyRecord>(
  sharedConfig: C,
  overrides: O[] = [],
  excludeKeys: string[] = []
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
        let line = `${key}: ${isQuoted(value) ? value : JSON.stringify(value, null, 2)}`;
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
