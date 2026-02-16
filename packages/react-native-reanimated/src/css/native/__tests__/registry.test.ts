'use strict';
import {
  ERROR_MESSAGES,
  getPropsBuilder,
  hasPropsBuilder,
  registerComponentPropsBuilder,
  STYLE_PROPERTIES_CONFIG,
} from '../../../common';

describe('registry', () => {
  describe('hasPropsBuilder', () => {
    test('returns true for registered component names', () => {
      const componentName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);

      expect(hasPropsBuilder(componentName)).toBe(true);
    });

    test('returns true for registered compound component names', () => {
      const componentName = 'CustomComponent';
      const componentChildName = 'CustomComponentChild';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config, {
        componentChildName: componentChildName,
      });

      expect(hasPropsBuilder(componentName, componentChildName)).toBe(true);
    });

    test('returns true for component names if compound component was registered ', () => {
      const componentName = 'CustomComponent';
      const componentChildName = 'CustomComponentChild';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config, {
        componentChildName: componentChildName,
      });

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

    test('returns registered props builder for custom compound component', () => {
      const componentName = 'CustomComponent';
      const componentChildName = 'CustomComponentChild';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config, {
        componentChildName: componentChildName,
      });
      const propsBuilder = getPropsBuilder(componentName, componentChildName);

      expect(propsBuilder).toBeDefined();
      expect(typeof propsBuilder.build).toBe('function');
    });

    test('returns registered props builder for component if custom compound component was registered', () => {
      const componentName = 'CustomComponent';
      const componentChildName = 'CustomComponentChild';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config, {
        componentChildName: componentChildName,
      });
      const propsBuilder = getPropsBuilder(componentName);

      expect(propsBuilder).toBeDefined();
      expect(typeof propsBuilder.build).toBe('function');
    });

    test('returns registered props builder for component different than for the compound component', () => {
      const componentName = 'CustomComponent';
      const componentChildName = 'CustomComponentChild';
      const config = { width: true, height: true };
      const config2 = { width: true, height: true, length: true };

      registerComponentPropsBuilder(componentName, config);
      registerComponentPropsBuilder(componentName, config2, {
        componentChildName: componentChildName,
      });
      const propsBuilder = getPropsBuilder(componentName);
      const propsBuilder2 = getPropsBuilder(componentName, componentChildName);

      expect(propsBuilder).toBeDefined();
      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder == propsBuilder2).toBe(false);
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

    test('throws error for unregistered component names for compound component', () => {
      expect(() => {
        getPropsBuilder('UnregisteredComponent', 'UnregisteredComponentChild');
      }).toThrow(
        ERROR_MESSAGES.propsBuilderNotFound(
          'UnregisteredComponent',
          'UnregisteredComponentChild'
        )
      );
    });
  });

  describe('registerComponentPropsBuilder', () => {
    test('registers a props builder', () => {
      const componentName = 'TestComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);

      expect(hasPropsBuilder(componentName)).toBe(true);
      expect(getPropsBuilder(componentName)).toBeDefined();
    });

    test('works with base properties config', () => {
      const componentName = 'BaseConfigComponent';

      registerComponentPropsBuilder(componentName, STYLE_PROPERTIES_CONFIG);

      expect(hasPropsBuilder(componentName)).toBe(true);
      expect(getPropsBuilder(componentName)).toBeDefined();
    });
  });
});
