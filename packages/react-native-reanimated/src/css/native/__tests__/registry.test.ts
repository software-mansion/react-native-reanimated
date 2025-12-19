'use strict';
import {
  BASE_PROPERTIES_CONFIG,
  ERROR_MESSAGES,
  registry,

  registerComponentPropsBuilder,
} from '../../../common';

describe('registry', () => {
  describe('hasPropsBuilder', () => {
    test('returns true for registered component names', () => {
      const componentName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);

      expect(registry.hasPropsBuilder(componentName)).toBe(true);
    });

    test('returns true for RCT prefixed component names', () => {
      expect(registry.hasPropsBuilder('RCTView')).toBe(true);
      expect(registry.hasPropsBuilder('RCTText')).toBe(true);
    });

    test('returns false for unregistered component names', () => {
      expect(registry.hasPropsBuilder('UnregisteredComponent')).toBe(false);
    });
  });

  describe('getPropsBuilder', () => {
    test('returns registered props builder for custom component', () => {
      const componentName = 'CustomComponent';
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
        registry.getPropsBuilder('UnregisteredComponent');
      }).toThrow(ERROR_MESSAGES.propsBuilderNotFound('UnregisteredComponent'));
    });
  });

  describe('registerComponentPropsBuilder', () => {
    test('registers a style builder', () => {
      const componentName = 'TestComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);

      expect(registry.hasPropsBuilder(componentName)).toBe(true);
      expect(registry.getPropsBuilder(componentName)).toBeDefined();
    });

    test('works with base properties config', () => {
      const componentName = 'BaseConfigComponent';

      registerComponentPropsBuilder(componentName, BASE_PROPERTIES_CONFIG);

      expect(registry.hasPropsBuilder(componentName)).toBe(true);
      expect(registry.getPropsBuilder(componentName)).toBeDefined();
    });
  });
});
