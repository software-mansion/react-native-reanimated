'use strict';
import {
  ERROR_MESSAGES,
  registerComponentPropsBuilder,
  registry,
} from '../registry';

describe('web registry', () => {
  describe('hasPropsBuilder', () => {
    test('returns true for registered component names', () => {
      const componentName = 'CustomWebComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);

      expect(registry.hasPropsBuilder(componentName)).toBe(true);
    });

    test('returns true for RCT prefixed component names', () => {
      expect(registry.hasPropsBuilder('RCTView')).toBe(true);
      expect(registry.hasPropsBuilder('RCTText')).toBe(true);
    });

    test('returns false for unregistered component names', () => {
      expect(registry.hasPropsBuilder('UnregisteredWebComponent')).toBe(false);
    });
  });

  describe('getPropsBuilder', () => {
    test('returns registered props builder for custom component', () => {
      const componentName = 'CustomWebComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);
      const propsBuilder = registry.getPropsBuilder(componentName);

      expect(propsBuilder).toBeDefined();
      expect(typeof propsBuilder.build).toBe('function');
    });

    test('returns base props builder for RCT prefixed components', () => {
      const propsBuilder = registry.getPropsBuilder('RCTView');

      expect(propsBuilder).toBeDefined();
      expect(typeof propsBuilder.build).toBe('function');
    });

    test('throws error for unregistered component names', () => {
      expect(() => {
        registry.getPropsBuilder('UnregisteredWebComponent');
      }).toThrow(
        ERROR_MESSAGES.propsBuilderNotFound('UnregisteredWebComponent')
      );
    });
  });

  describe('registerComponentPropsBuilder', () => {
    test('registers a style builder', () => {
      const componentName = 'TestWebComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);

      expect(registry.hasPropsBuilder(componentName)).toBe(true);
      expect(registry.getPropsBuilder(componentName)).toBeDefined();
    });

    test('returns CSS string for valid props', () => {
      const componentName = 'CSSTestComponent';
      const config = { width: 'px', height: 'px' };

      registerComponentPropsBuilder(componentName, config);
      const propsBuilder = registry.getPropsBuilder(componentName);
      const cssString = propsBuilder.build({ width: 100, height: 200 });

      expect(cssString).toContain('width');
      expect(cssString).toContain('height');
    });
  });
});
