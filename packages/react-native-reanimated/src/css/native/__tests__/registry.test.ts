'use strict';
import { BASE_PROPERTIES_CONFIG } from '../../../common';
import {
  ERROR_MESSAGES,
  getPropsBuilder,
  hasPropsBuilder,
  registerComponentPropsBuilder,
} from '../registry';

describe('registry', () => {
  describe('hasPropsBuilder', () => {
    test('returns true for registered component names', () => {
      const componentName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);

      expect(hasPropsBuilder(componentName)).toBe(true);
    });

    test('returns true for RCT prefixed component names', () => {
      expect(hasPropsBuilder('RCTView')).toBe(true);
      expect(hasPropsBuilder('RCTText')).toBe(true);
    });

    test('returns false for unregistered component names', () => {
      expect(hasPropsBuilder('UnregisteredComponent')).toBe(false);
    });
  });

  describe('getPropsBuilder', () => {
    test('returns registered props builder for custom component', () => {
      const componentName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);
      const propsBuilder = getPropsBuilder(componentName);

      expect(propsBuilder).toBeDefined();
      expect(typeof propsBuilder.build).toBe('function');
    });

    test('returns base props builder for RCT prefixed components', () => {
      const propsBuilder = getPropsBuilder('RCTView');

      expect(propsBuilder).toBeDefined();
      expect(typeof propsBuilder.build).toBe('function');
    });

    test('throws error for unregistered component names', () => {
      expect(() => {
        getPropsBuilder('UnregisteredComponent');
      }).toThrow(ERROR_MESSAGES.propsBuilderNotFound('UnregisteredComponent'));
    });
  });

  describe('registerComponentPropsBuilder', () => {
    test('registers a style builder', () => {
      const componentName = 'TestComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);

      expect(hasPropsBuilder(componentName)).toBe(true);
      expect(getPropsBuilder(componentName)).toBeDefined();
    });

    test('works with base properties config', () => {
      const componentName = 'BaseConfigComponent';

      registerComponentPropsBuilder(componentName, BASE_PROPERTIES_CONFIG);

      expect(hasPropsBuilder(componentName)).toBe(true);
      expect(getPropsBuilder(componentName)).toBeDefined();
    });
  });
});
