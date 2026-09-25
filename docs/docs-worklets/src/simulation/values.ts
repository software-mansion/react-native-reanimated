export function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }
  if (isRuntimeHandle(value)) {
    return `runtime "${value.name}"`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function isRuntimeHandle(
  value: unknown
): value is { __workletRuntime: true; name: string; coreId: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __workletRuntime?: unknown }).__workletRuntime === true
  );
}

export function formatArg(value: unknown): string {
  return typeof value === 'string' ? JSON.stringify(value) : formatValue(value);
}

export function formatLogArgs(args: unknown[]): string {
  return args.map(formatValue).join(' ');
}

export function jobLabel(name: string, args: unknown[]): string {
  return `${name}(${args.map(formatArg).join(', ')})`;
}
