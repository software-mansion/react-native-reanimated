/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { AnyRecord } from '@/types';

export function isValidPropertyName(propertyName: string): boolean {
  const validPropertyNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return validPropertyNamePattern.test(propertyName);
}

export const isEasingFunction = (
  value: unknown
): value is { toString: () => string } => {
  return typeof value === 'object' && value !== null && 'normalize' in value;
};

export const isLeafValue = (value: unknown): boolean =>
  typeof value !== 'object' ||
  value === null ||
  Array.isArray(value) ||
  'normalize' in value ||
  'normalizedKeyframes' in value;

export const formatLeafValue = (
  value: unknown,
  nextTab = '',
  dense = false
): string => {
  const formatValue = (item: unknown) =>
    isEasingFunction(item) ? item.toString() : JSON.stringify(item);

  if (Array.isArray(value)) {
    if (!dense) {
      // multiline array
      return `[\n${value
        .map((item) => `${nextTab}  ${formatValue(item)}`)
        .join(',\n')}\n${nextTab}]`;
    }
    return `[${value.map((item) => formatValue(item)).join(', ')}]`;
  }

  return formatValue(value);
};

export const MAX_NOT_WRAPPED_LENGTH = 48;

export const stringifyConfig = <T extends AnyRecord>(
  object: T,
  dense = false,
  depth = 0
): string => {
  if (depth > 10) {
    throw new Error('Object nesting is too deep');
  }

  if ('cssRules' in object) {
    object = object.cssRules;
  }

  const formatValue = (
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    currentDepth: number,
    makeDense: boolean
  ) => {
    const nextTab = '  '.repeat(currentDepth);

    if (key === 'animationName') {
      return Array.isArray(value) && value.length > 0
        ? `[\n${nextTab}  ${value
            .map((item) => stringifyConfig(item, makeDense, depth + 2))
            .join(`,\n${nextTab}  `)}\n${nextTab}]`
        : stringifyConfig(value, makeDense, currentDepth);
    }

    return isLeafValue(value)
      ? formatLeafValue(value, nextTab, makeDense)
      : stringifyConfig(value, makeDense, currentDepth);
  };

  const formatLine = (
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    depth_: number,
    makeDense: boolean
  ) => {
    const nextTab = '  '.repeat(depth_);
    return `${nextTab}${key}: ${formatValue(key, value, depth_, makeDense)}`;
  };

  const currentTab = '  '.repeat(depth);
  const keys = Object.keys(object);

  return `{\n${keys
    .map((key) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = object[key];
      const formattedKey = isValidPropertyName(key) ? key : `"${key}"`;

      const denseFormat = formatLine(formattedKey, value, depth + 1, true);
      if (dense || denseFormat.length < MAX_NOT_WRAPPED_LENGTH) {
        return denseFormat;
      }
      return formatLine(formattedKey, value, depth + 1, false);
    })
    .join(',\n')}\n${currentTab}}`;
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
      return value;
    }
    const stringified = JSON.stringify(value);
    return JSON.parse(stringified) === value ? stringified : value;
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
        if (key === 'animationName') {
          parsedValue = stringifyConfig(value, false, 0);
        } else if (isLeafValue(value)) {
          const formatLine = (makeDense: boolean) =>
            `${key}: ${formatLeafValue(value, '', makeDense)}`;
          const denseFormat = formatLine(true);
          parsedValue =
            denseFormat.length < MAX_NOT_WRAPPED_LENGTH
              ? formatLeafValue(value, '', true)
              : formatLeafValue(value, '', false);
        } else if (isQuoted(value)) {
          parsedValue = value;
        } else {
          parsedValue = JSON.stringify(value);
        }

        let line = `${key}: ${parsedValue},`;
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
