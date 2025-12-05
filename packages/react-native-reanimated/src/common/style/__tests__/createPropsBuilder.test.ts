'use strict';

import type { ValueProcessor } from '../../types';
import { ValueProcessorTarget } from '../../types';
import { ReanimatedError } from '../../errors';
import createPropsBuilder from '../createPropsBuilder';

type TestStyle = {
  width?: number;
  margin?: string | number;
  borderRadius?: number;
  padding?: number;
  shadowColor?: number;
  shadowOpacity?: number;
  shadowRadius?: number;
  height?: number;
};

type ConfigEntry = boolean | { process: ValueProcessor } | 'loop';

type TestConfig = Record<keyof TestStyle, ConfigEntry>;

const BASE_CONFIG: TestConfig = {
  width: false,
  margin: false,
  borderRadius: false,
  padding: false,
  shadowColor: false,
  shadowOpacity: false,
  shadowRadius: false,
  height: false,
};

const createBuilder = (configOverrides: Partial<TestConfig>) => {
  const config: TestConfig = { ...BASE_CONFIG, ...configOverrides };

  return createPropsBuilder<TestStyle, TestConfig>({
    config,
    processConfigValue(configValue) {
      if (configValue === true) {
        return (value: unknown) => value;
      }

      if (configValue === 'loop') {
        return configValue;
      }

      if (
        configValue &&
        typeof configValue === 'object' &&
        'process' in configValue &&
        typeof configValue.process === 'function'
      ) {
        return configValue.process;
      }

      return undefined;
    },
  });
};

describe(createPropsBuilder, () => {
  test('skips undefined values unless includeUndefined is true', () => {
    const builder = createBuilder({
      width: true,
      margin: true,
      borderRadius: true,
    });

    const style: TestStyle = {
      width: undefined,
      margin: 'auto',
      borderRadius: 10,
    };

    expect(builder.build(style)).toEqual({
      margin: 'auto',
      borderRadius: 10,
    });

    expect(
      builder.build(style, { includeUndefined: true })
    ).toEqual({
      width: undefined,
      margin: 'auto',
      borderRadius: 10,
    });
  });

  test('ignores properties not present in config', () => {
    const builder = createBuilder({ width: true });

    const style: TestStyle = {
      width: 120,
      height: 300,
    };

    expect(builder.build(style)).toEqual({ width: 120 });
  });

  test('passes provided context to processors', () => {
    const processor = jest.fn().mockReturnValue(24);
    const builder = createBuilder({
      borderRadius: { process: processor },
    });

    builder.build({ borderRadius: 12 }, {
      target: ValueProcessorTarget.CSS,
    });

    expect(processor).toHaveBeenCalledWith(12, {
      target: ValueProcessorTarget.CSS,
    });
  });

  test('uses default target context when target not set', () => {
    const processor = jest.fn().mockReturnValue(10);
    const builder = createBuilder({
      padding: { process: processor },
    });

    builder.build({ padding: 5 });

    expect(processor).toHaveBeenCalledWith(5, {
      target: ValueProcessorTarget.Default,
    });
  });

  test('merges record results without overwriting original props', () => {
    const builder = createBuilder({
      shadowColor: {
        process: () => ({
          shadowOpacity: 0.5,
          shadowRadius: 6,
        }),
      },
      shadowOpacity: true,
      shadowRadius: true,
    });

    const style: TestStyle = {
      shadowColor: 0xff0000,
      shadowOpacity: 0.8,
    };

    expect(builder.build(style)).toEqual({
      shadowOpacity: 0.8,
      shadowRadius: 6,
    });
  });

  test('allows processors to return undefined based on includeUndefined option', () => {
    const builder = createBuilder({
      width: {
        process: () => undefined,
      },
    });

    expect(builder.build({ width: 10 })).toEqual({});
    expect(
      builder.build({ width: 10 }, { includeUndefined: true })
    ).toEqual({ width: undefined });
  });

  test('throws when processor resolution exceeds maximum depth', () => {
    expect(() =>
      createBuilder({
        width: 'loop',
      })
    ).toThrow(new ReanimatedError('Max process depth for props builder reached for property width'));
  });
});
