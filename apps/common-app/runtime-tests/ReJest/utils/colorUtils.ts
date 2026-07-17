import { processColor } from 'react-native';

export function isColor(value: unknown): value is string {
  return typeof value === 'string' && processColor(value) != null;
}

export function processColorNumber(value: string): number {
  return (processColor(value) as number) ?? 0;
}
