import { ToolError } from './errors.mts';

export type Check = (value: unknown, label: string, problems: string[]) => void;

export function record(
  value: unknown,
  label: string,
  problems: string[]
): Record<string, unknown> {
  if (isRecord(value)) {
    return value;
  }
  problems.push(`${label} must be an object`);
  return {};
}

export function throwProblems(title: string, problems: readonly string[]) {
  if (problems.length > 0) {
    throw new ToolError(
      `${title}:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`
    );
  }
}

export const aString = typed('a string', (value) => typeof value === 'string');

export const aNumber = typed(
  'a finite number',
  (value) => typeof value === 'number' && Number.isFinite(value)
);

export const anInteger = typed('an integer', Number.isInteger);

export const aBoolean = typed(
  'true or false',
  (value) => typeof value === 'boolean'
);

export const anObject = typed('an object', isRecord);

export function oneOf(values: readonly unknown[]): Check {
  return typed(
    `one of ${values.map((value) => JSON.stringify(value)).join(', ')}`,
    (value) => values.includes(value)
  );
}

export function nullable(check: Check): Check {
  return (value, label, problems) => {
    if (value !== null) {
      check(value, label, problems);
    }
  };
}

export function optional(check: Check): Check {
  return (value, label, problems) => {
    if (value !== undefined) {
      check(value, label, problems);
    }
  };
}

export function listOf(check: Check): Check {
  return (value, label, problems) => {
    if (!Array.isArray(value)) {
      problems.push(`${label} must be a list`);
      return;
    }
    value.forEach((item, i) => check(item, `${label}[${i}]`, problems));
  };
}

export function valuesOf(check: Check): Check {
  return (value, label, problems) => {
    Object.entries(record(value, label, problems)).forEach(([key, item]) =>
      check(item, `${label}.${key}`, problems)
    );
  };
}

export function shape(fields: Record<string, Check>): Check {
  return (value, label, problems) => {
    const object = record(value, label, problems);
    Object.entries(fields).forEach(([key, check]) =>
      check(object[key], `${label}.${key}`, problems)
    );
  };
}

export function both(first: Check, second: Check): Check {
  return (value, label, problems) => {
    first(value, label, problems);
    second(value, label, problems);
  };
}

export function when(
  condition: (value: Record<string, unknown>) => boolean,
  check: Check
): Check {
  return (value, label, problems) => {
    if (isRecord(value) && condition(value)) {
      check(value, label, problems);
    }
  };
}

function typed(description: string, test: (value: unknown) => boolean): Check {
  return (value, label, problems) => {
    if (!test(value)) {
      problems.push(`${label} must be ${description}`);
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
