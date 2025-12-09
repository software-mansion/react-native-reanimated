'use strict';
import { BASE_PROPERTIES_CONFIG } from '../../../common';
import {
  ERROR_MESSAGES,
  getStyleBuilder,
  hasStyleBuilder,
  registerComponentStyleBuilder,
} from '../registry';

describe('registry', () => {
  describe('hasStyleBuilder', () => {
    test('returns true for registered component names', () => {
      const componentName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentStyleBuilder(componentName, config);

      expect(hasStyleBuilder(componentName)).toBe(true);
    });

    test('returns true for RCT prefixed component names', () => {
      expect(hasStyleBuilder('RCTView')).toBe(true);
      expect(hasStyleBuilder('RCTText')).toBe(true);
    });

    test('returns false for unregistered component names', () => {
      expect(hasStyleBuilder('UnregisteredComponent')).toBe(false);
    });
  });

  describe('getStyleBuilder', () => {
    test('returns registered style builder for custom component', () => {
      const componentName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentStyleBuilder(componentName, config);
      const styleBuilder = getStyleBuilder(componentName);

      expect(styleBuilder).toBeDefined();
      expect(typeof styleBuilder.buildFrom).toBe('function');
    });

    test('returns base style builder for RCT prefixed components', () => {
      const styleBuilder = getStyleBuilder('RCTView');

      expect(styleBuilder).toBeDefined();
      expect(typeof styleBuilder.buildFrom).toBe('function');
    });

    test('throws error for unregistered component names', () => {
      expect(() => {
        getStyleBuilder('UnregisteredComponent');
      }).toThrow(ERROR_MESSAGES.styleBuilderNotFound('UnregisteredComponent'));
    });
  });

  describe('registerComponentStyleBuilder', () => {
    test('registers a style builder', () => {
      const componentName = 'TestComponent';
      const config = { width: true, height: true };

      registerComponentStyleBuilder(componentName, config);

      expect(hasStyleBuilder(componentName)).toBe(true);
      expect(getStyleBuilder(componentName)).toBeDefined();
    });

    test('works with base properties config', () => {
      const componentName = 'BaseConfigComponent';

      registerComponentStyleBuilder(componentName, BASE_PROPERTIES_CONFIG);

      expect(hasStyleBuilder(componentName)).toBe(true);
      expect(getStyleBuilder(componentName)).toBeDefined();
    });
  });
});
