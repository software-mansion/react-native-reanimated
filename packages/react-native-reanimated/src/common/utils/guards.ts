'use strict';
import type { ConfigPropertyAlias, UnknownRecord } from '../types';

export const isDefined = <T>(value: T): value is NonNullable<T> =>
  value !== undefined && value !== null;

export const isAngle = (
  value: string | number
): value is `${number}deg` | `${number}rad` => {
  'worklet';
  return typeof value === 'string' && /^-?\d+(\.\d+)?(deg|rad)$/.test(value);
};

export const isNumber = (value: unknown): value is number => {
  'worklet';
  return typeof value === 'number' && !isNaN(value);
};

export const isNumberArray = (value: unknown): value is number[] => {
  'worklet';
  return Array.isArray(value) && value.every(isNumber);
};

export const isLength = (value: string) => {
  'worklet';
  return value.endsWith('px') || !isNaN(Number(value));
};

export const isPercentage = (value: unknown): value is `${number}%` => {
  'worklet';
  return typeof value === 'string' && /^-?\d+(\.\d+)?%$/.test(value);
};

export const isRecord = <T extends UnknownRecord = UnknownRecord>(
  value: unknown
): value is T => {
  'worklet';
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isEmptyObject = (value: unknown): boolean => {
  'worklet';
  return isRecord(value) && Object.keys(value).length === 0;
};

export const isConfigPropertyAlias = <P extends object>(
  value: unknown
): value is ConfigPropertyAlias<P> =>
  !!value &&
  typeof value === 'object' &&
  'as' in value &&
  typeof value.as === 'string';

export const hasValueProcessor = <T extends (params: unknown) => unknown>(
  configValue: unknown
): configValue is { process: T } =>
  isRecord(configValue) && 'process' in configValue;
