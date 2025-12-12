'use strict';

import { ValueProcessorTarget } from '../../types';
import { createNativePropsBuilder } from '../propsBuilder';

describe('createNativePropsBuilder', () => {
  describe('build without context', () => {
    test('creates builder with boolean config values', () => {
      type TestProps = {
        prop1: string;
        prop2: string;
        prop3: string;
      };

      const builder = createNativePropsBuilder<TestProps>({
        prop1: true,
        prop2: false,
        prop3: true,
      });

      const input = {
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3',
      };

      const result = builder.build(input);

      expect(result).toEqual({
        prop1: 'value1',
        prop3: 'value3',
      });
    });

    test('creates builder with processor config', () => {
      type TestProps = {
        value: number;
        unchanged: string;
      };

      const builder = createNativePropsBuilder<TestProps>({
        value: {
          process: (val: number) => val * 2,
        },
        unchanged: true,
      });

      const input = {
        value: 5,
        unchanged: 'test',
      };

      const result = builder.build(input);

      expect(result).toEqual({
        value: 10,
        unchanged: 'test',
      });
    });

    test('creates builder with property alias config', () => {
      type TestProps = {
        source: string;
        target: string;
      };

      const builder = createNativePropsBuilder<TestProps>({
        source: true,
        target: { as: 'source' },
      });

      const input = {
        source: 'original',
        target: 'aliased',
      };

      const result = builder.build(input);

      expect(result).toEqual({
        source: 'original',
        target: 'aliased',
      });
    });

    test('handles mixed config types', () => {
      type MixedProps = {
        included: string;
        excluded: string;
        processed: number;
        aliased: string;
      };

      const builder = createNativePropsBuilder<MixedProps>({
        included: true,
        excluded: false,
        processed: {
          process: (val: number) => val + 100,
        },
        aliased: { as: 'included' },
      });

      const input = {
        included: 'yes',
        excluded: 'no',
        processed: 50,
        aliased: 'alias-value',
      };

      const result = builder.build(input);

      expect(result).toEqual({
        included: 'yes',
        processed: 150,
        aliased: 'alias-value',
      });
    });

    test('handles nested aliases correctly', () => {
      type NestedProps = {
        prop1: string;
        prop2: string;
        prop3: string;
      };

      const builder = createNativePropsBuilder<NestedProps>({
        prop1: true,
        prop2: { as: 'prop1' },
        prop3: { as: 'prop2' },
      });

      const input = {
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3',
      };

      const result = builder.build(input);

      // All three should be included as they all eventually resolve to prop1 which is true
      expect(result).toEqual({
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3',
      });
    });

    test('filters out unknown properties by default', () => {
      type KnownProps = {
        width: number;
      };

      const builder = createNativePropsBuilder<KnownProps>({
        width: true,
      });

      const style = {
        width: 100,
        unknownProp: 'should be filtered',
        customProp: 123,
      };

      const result = builder.build(style);

      expect(result).toEqual({ width: 100 });
    });

    test('handles undefined values correctly', () => {
      type TestProps = {
        width?: number;
        height: number;
      };

      const builder = createNativePropsBuilder<TestProps>({
        width: true,
        height: true,
      });

      const style = {
        width: undefined,
        height: 100,
      };

      expect(builder.build(style)).toEqual({ height: 100 });
      expect(builder.build(style, { includeUndefined: true })).toEqual({
        width: undefined,
        height: 100,
      });
    });
  });

  describe('build with context', () => {
    test('includes unknown properties when includeUnknown is true', () => {
      type KnownProps = {
        width: number;
      };

      const builder = createNativePropsBuilder<KnownProps>({
        width: true,
      });

      const style = {
        width: 100,
        unknownProp: 'should be included',
        customProp: 123,
      };

      const result = builder.build(style, { includeUnknown: true });

      expect(result).toEqual({
        width: 100,
        unknownProp: 'should be included',
        customProp: 123,
      });
    });

    test('processor receives correct context', () => {
      type TestProps = {
        testProp: string;
      };

      let capturedContext: ValueProcessorTarget | undefined;

      const builder = createNativePropsBuilder<TestProps>({
        testProp: {
          process: (val: string, context) => {
            capturedContext = context?.target;
            return val.toUpperCase();
          },
        },
      });

      builder.build(
        { testProp: 'hello' },
        { target: ValueProcessorTarget.CSS }
      );

      expect(capturedContext).toBe('css');
    });

    test('passes correct target context to processors', () => {
      type TestProps = {
        value: string;
      };

      const contexts: ValueProcessorTarget[] = [];

      const builder = createNativePropsBuilder<TestProps>({
        value: {
          process: (val: string, context) => {
            if (context) {
              contexts.push(context.target);
            }
            return val;
          },
        },
      });

      const input = { value: 'test' };

      builder.build(input);
      builder.build(input, { target: ValueProcessorTarget.CSS });
      builder.build(input, { target: ValueProcessorTarget.Default });

      expect(contexts).toEqual([
        ValueProcessorTarget.Default,
        ValueProcessorTarget.CSS,
        ValueProcessorTarget.Default,
      ]);
    });
  });
});
