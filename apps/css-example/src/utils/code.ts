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

export const isLeafValue = (value: unknown): boolean => {
  return (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    'normalize' in value
  );
};

export const formatLeafValue = (
  value: unknown,
  nextTab = '',
  dense = false
): string => {
  if (Array.isArray(value)) {
    if (!dense) {
      // multiline array
      return `[\n${value
        .map(
          (item) =>
            `${nextTab}  ${isEasingFunction(item) ? item.toString() : JSON.stringify(item)}`
        )
        .join(',\n')}\n${nextTab}]`;
    }
    return `[${value
      .map((item) =>
        isEasingFunction(item) ? item.toString() : JSON.stringify(item)
      )
      .join(', ')}]`;
  }

  return isEasingFunction(value) ? value.toString() : JSON.stringify(value);
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

  const currentTab = '  '.repeat(depth);
  const nextTab = '  '.repeat(depth + 1);
  const keys = Object.keys(object);

  return `{\n${keys
    .map((key) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = object[key];
      const formattedKey = isValidPropertyName(key) ? key : `"${key}"`;

      const formatLine = (makeDense: boolean) =>
        `${nextTab}${formattedKey}: ${
          isLeafValue(value)
            ? formatLeafValue(value, nextTab, makeDense)
            : stringifyConfig(value, makeDense, depth + 1)
        }`;

      const denseFormat = formatLine(true);
      if (dense || denseFormat.length < MAX_NOT_WRAPPED_LENGTH) {
        return denseFormat;
      }
      return formatLine(false);
    })
    .join('\n')}\n${currentTab}},`;
};
