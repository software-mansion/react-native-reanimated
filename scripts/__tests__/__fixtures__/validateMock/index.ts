export const foo = 1;

export function bar(value: number): number {
  return value;
}

export type Baz = number;

enum Kind {
  A,
  B,
}

export type { Kind };
