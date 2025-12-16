'use strict';
import { createWebPropsBuilder } from '../propsBuilder';
import { createRuleBuilder } from '../builderFactories';

describe('createWebPropsBuilder', () => {
  describe('build with basic config', () => {
    test('creates builder with boolean config values', () => {
      type TestProps = {
        prop1: string;
        prop2: string;
        prop3: string;
      };

      const builder = createWebPropsBuilder<TestProps>({
        prop1: true,
        prop2: false,
        prop3: true,
      });

      const result = builder.build({
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3',
      });

      expect(result).toBe('prop1: value1; prop3: value3');
    });

    test('handles suffix config', () => {
      type TestProps = {
        width: number | string;
        height: number | string;
      };

      const builder = createWebPropsBuilder<TestProps>({
        width: 'px',
        height: 'px',
      });

      const result = builder.build({
        width: 100,
        height: '50%',
      });

      expect(result).toBe('width: 100px; height: 50%');
    });

    test('handles property aliases', () => {
      type TestProps = {
        marginStart: number;
        marginLeft: number;
      };

      const builder = createWebPropsBuilder<TestProps>({
        marginStart: { as: 'marginLeft' },
        marginLeft: 'px',
      });

      const result = builder.build({
        marginStart: 10,
        marginLeft: 20,
      });

      expect(result).toBe('margin-start: 10px; margin-left: 20px');
    });

    test('handles value processors', () => {
      type TestProps = {
        value: number;
        color: string;
      };

      const builder = createWebPropsBuilder<TestProps>({
        value: {
          process: (val: number) => `${val * 2}`,
        },
        color: {
          process: (val: string) => val.toUpperCase(),
        },
      });

      const result = builder.build({
        value: 5,
        color: 'red',
      });

      expect(result).toBe('value: 10; color: RED');
    });
  });

  describe('build with rule builders', () => {
    test('handles rule builders', () => {
      type ShadowProps = {
        shadowColor: string;
        shadowOffset: { width: number; height: number };
        shadowRadius: number;
      };

      const shadowBuilder = createRuleBuilder<Partial<ShadowProps>>(
        {
          shadowColor: true,
          shadowOffset: {
            process: (val) => `${val.width}px ${val.height}px`,
          },
          shadowRadius: 'px',
        },
        ({ shadowColor = '#000', shadowOffset = '0 0', shadowRadius = '0' }) => ({
          boxShadow: `${shadowOffset} ${shadowRadius} ${shadowColor}`,
        })
      );

      const builder = createWebPropsBuilder<ShadowProps>({
        shadowColor: shadowBuilder as unknown as any,
        shadowOffset: shadowBuilder as unknown as any,
        shadowRadius: shadowBuilder as unknown as any,
      });

      const result = builder.build({
        shadowColor: 'red',
        shadowOffset: { width: 2, height: 4 },
        shadowRadius: 8,
      });

      expect(result).toBe('box-shadow: 2px 4px 8px red');
    });

    test('merges rule builder results with regular props', () => {
      type MixedProps = {
        width: number;
        shadowColor: string;
        shadowRadius: number;
      };

      const shadowBuilder = createRuleBuilder<Partial<Pick<MixedProps, "shadowColor" | "shadowRadius">>>(
        {
          shadowColor: true,
          shadowRadius: 'px',
        },
        ({ shadowColor = '#000', shadowRadius = '0' }) => ({
          boxShadow: `0 0 ${shadowRadius} ${shadowColor}`,
        })
      );

      const builder = createWebPropsBuilder<MixedProps>({
        width: 'px',
        shadowColor: shadowBuilder as unknown as any,
        shadowRadius: shadowBuilder as unknown as any,
      });

      const result = builder.build({
        width: 100,
        shadowColor: 'blue',
        shadowRadius: 5,
      });

      expect(result).toContain('width: 100px');
      expect(result).toContain('box-shadow: 0 0 5px blue');
    });
  });

  describe('build with mixed config', () => {
    test('handles combination of all config types', () => {
      type ComplexProps = {
        display: string;
        width: number;
        marginStart: number;
        marginLeft: number;
        color: string;
        shadowRadius: number;
      };

      const shadowBuilder = createRuleBuilder<Partial<Pick<ComplexProps, "shadowRadius">>>(
        {
          shadowRadius: 'px',
        },
        ({ shadowRadius = '0' }) => ({
          boxShadow: `0 0 ${shadowRadius} black`,
        })
      );

      const builder = createWebPropsBuilder<ComplexProps>({
        display: true,
        width: 'px',
        marginStart: { as: 'marginLeft' },
        marginLeft: 'px',
        color: {
          process: (val: string) => val.toUpperCase(),
        },
        shadowRadius: shadowBuilder as unknown as any,
      });

      const result = builder.build({
        display: 'flex',
        width: 200,
        marginStart: 10,
        marginLeft: 20,
        color: 'red',
        shadowRadius: 8,
      });

      expect(result).toContain('display: flex');
      expect(result).toContain('width: 200px');
      expect(result).toContain('margin-start: 10px');
      expect(result).toContain('margin-left: 20px');
      expect(result).toContain('color: RED');
      expect(result).toContain('box-shadow: 0 0 8px black');
    });
  });

  describe('CSS output formatting', () => {
    test('converts camelCase to kebab-case', () => {
      type TestProps = {
        backgroundColor: string;
        borderRadius: number;
      };

      const builder = createWebPropsBuilder<TestProps>({
        backgroundColor: true,
        borderRadius: 'px',
      });

      const result = builder.build({
        backgroundColor: 'blue',
        borderRadius: 5,
      });

      expect(result).toBe('background-color: blue; border-radius: 5px');
    });

    test('returns null for empty props', () => {
      type TestProps = {
        excluded: string;
      };

      const builder = createWebPropsBuilder<TestProps>({
        excluded: false,
      });

      const result = builder.build({
        excluded: 'value',
      });

      expect(result).toBeNull();
    });

    test('filters out undefined values', () => {
      type TestProps = {
        width: number | undefined;
        height: number | undefined;
      };

      const builder = createWebPropsBuilder<TestProps>({
        width: 'px',
        height: 'px',
      });

      const result = builder.build({
        width: 100,
        height: undefined,
      });

      expect(result).toBe('width: 100px');
    });
  });
});
