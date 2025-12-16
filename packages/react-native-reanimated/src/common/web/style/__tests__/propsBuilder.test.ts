'use strict';
import { createWebPropsBuilder } from '../propsBuilder';
import { createWebRuleBuilder } from '../ruleBuilder';

describe(createWebPropsBuilder, () => {
  describe('CSS output formatting', () => {
    test('converts camelCase to kebab-case', () => {
      const builder = createWebPropsBuilder({
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
      const builder = createWebPropsBuilder({
        excluded: false,
      });

      const result = builder.build({
        excluded: 'value',
      });

      expect(result).toBeNull();
    });

    test('filters out undefined values', () => {
      const builder = createWebPropsBuilder({
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

  describe('build with basic config', () => {
    test('creates builder with boolean config values', () => {
      const builder = createWebPropsBuilder({
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
      const builder = createWebPropsBuilder({
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
      const builder = createWebPropsBuilder({
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
      const builder = createWebPropsBuilder({
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
      const shadowBuilder = createWebRuleBuilder(
        {
          shadowColor: true,
          shadowOffset: {
            process: (val: { width: number; height: number }) =>
              `${val.width}px ${val.height}px`,
          },
          shadowRadius: 'px',
        },
        ({
          shadowColor = '#000',
          shadowOffset = '0 0',
          shadowRadius = '0',
        }) => ({
          boxShadow: `${shadowOffset} ${shadowRadius} ${shadowColor}`,
        })
      );

      const builder = createWebPropsBuilder({
        shadowColor: shadowBuilder,
        shadowOffset: shadowBuilder,
        shadowRadius: shadowBuilder,
      });

      const result = builder.build({
        shadowColor: 'red',
        shadowOffset: { width: 2, height: 4 },
        shadowRadius: 8,
      });

      expect(result).toBe('box-shadow: 2px 4px 8px red');
    });

    test('merges rule builder results with regular props', () => {
      const shadowBuilder = createWebRuleBuilder(
        {
          shadowColor: true,
          shadowRadius: 'px',
        },
        ({ shadowColor = '#000', shadowRadius = '0' }) => ({
          boxShadow: `0 0 ${shadowRadius} ${shadowColor}`,
        })
      );

      const builder = createWebPropsBuilder({
        width: 'px',
        shadowColor: shadowBuilder,
        shadowRadius: shadowBuilder,
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
      const shadowBuilder = createWebRuleBuilder(
        {
          shadowRadius: 'px',
        },
        ({ shadowRadius = '0' }) => ({
          boxShadow: `0 0 ${shadowRadius} black`,
        })
      );

      const builder = createWebPropsBuilder({
        display: true,
        width: 'px',
        marginStart: { as: 'marginLeft' },
        marginLeft: 'px',
        color: {
          process: (val: string) => val.toUpperCase(),
        },
        shadowRadius: shadowBuilder,
      });

      const result = builder.build({
        display: 'flex',
        width: 200,
        marginStart: 10,
        marginLeft: 20,
        color: 'red',
        shadowRadius: 8,
      });

      const expectedProps = [
        'display: flex',
        'width: 200px',
        'margin-start: 10px',
        'margin-left: 20px',
        'color: RED',
        'box-shadow: 0 0 8px black',
      ];
      expectedProps.forEach((prop) => {
        expect(result).toContain(prop);
      });
    });
  });
});
