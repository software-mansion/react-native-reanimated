'use strict';
'worklet';
import type { AnyRecord, ConfigPropertyAlias } from '../types';

export const isDefined = <T>(value: T): value is NonNullable<T> =>
  value !== undefined && value !== null;

export const isAngle = (
  value: string | number
): value is `${number}deg` | `${number}rad` =>
  typeof value === 'string' && /^-?\d+(\.\d+)?(deg|rad)$/.test(value);

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value);

export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isNumber);

export const isLength = (value: string) => {
  return value.endsWith('px') || !isNaN(Number(value));
};

export const isPercentage = (value: unknown): value is `${number}%` =>
  typeof value === 'string' && /^-?\d+(\.\d+)?%$/.test(value);

export const isRecord = <T extends AnyRecord = AnyRecord>(
  value: unknown
): value is T =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const hasProp = <P extends AnyRecord, K extends string>(
  obj: P,
  key: K
): obj is P & Record<K, string> => key in obj;

export const isConfigPropertyAlias = <P extends AnyRecord>(
  value: unknown
): value is ConfigPropertyAlias<P> =>
  !!value &&
  typeof value === 'object' &&
  'as' in value &&
  typeof value.as === 'string';
