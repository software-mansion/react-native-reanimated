'use strict';
import {
  getPropsBuilder,
  getSeparatelyInterpolatedNestedProperties,
  registerComponentPropsBuilder,
  STYLE_PROPERTIES_CONFIG,
  stylePropsBuilder,
} from '../../../common';

describe('registry', () => {
  describe('getPropsBuilder', () => {
    test('returns default style props builder for unregistered component', () => {
      const propsBuilder = getPropsBuilder('UnregisteredComponent');
      expect(propsBuilder).toBe(stylePropsBuilder);
    });

    test('returns default style props builder for RCT prefixed components', () => {
      const propsBuilder = getPropsBuilder('RCTView');
      expect(propsBuilder).toBe(stylePropsBuilder);
    });

    test('returns registered props builder for custom component', () => {
      const componentName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(componentName, config);
      const propsBuilder = getPropsBuilder(componentName);

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns registered props builder using standard config', () => {
      const componentName = 'BaseConfigComponent';

      registerComponentPropsBuilder(componentName, STYLE_PROPERTIES_CONFIG);
      const propsBuilder = getPropsBuilder(componentName);

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('overwrites existing props builder when registered again', () => {
      const componentName = 'OverwriteComponent';
      registerComponentPropsBuilder(componentName, { width: true });
      const firstBuilder = getPropsBuilder(componentName);

      registerComponentPropsBuilder(componentName, { height: true });
      const secondBuilder = getPropsBuilder(componentName);

      expect(secondBuilder).not.toBe(firstBuilder);
      expect(secondBuilder).not.toBe(stylePropsBuilder);
    });
  });

  describe('getSeparatelyInterpolatedNestedProperties', () => {
    test('returns default separately interpolated nested properties for unregistered component', () => {
      const props = getSeparatelyInterpolatedNestedProperties(
        'UnregisteredComponent'
      );
      expect(props).toEqual(
        new Set([
          'boxShadow',
          'shadowOffset',
          'textShadowOffset',
          'transformOrigin',
        ])
      );
    });

    test('registers and retrieves separately interpolated nested properties', () => {
      const componentName = 'NestedPropsComponent';
      const config = { width: true };
      const nestedProps = ['prop1', 'prop2'];

      registerComponentPropsBuilder(componentName, config, {
        separatelyInterpolatedNestedProperties: nestedProps,
      });

      const retrievedProps =
        getSeparatelyInterpolatedNestedProperties(componentName);
      expect(retrievedProps).toEqual(new Set(nestedProps));
    });
  });
});
