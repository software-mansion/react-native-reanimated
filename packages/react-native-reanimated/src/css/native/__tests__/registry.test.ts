'use strict';
import {
  getCompoundComponentName,
  getPropsBuilder,
  getSeparatelyInterpolatedNestedProperties,
  registerComponentPropsBuilder,
  STYLE_PROPERTIES_CONFIG,
  stylePropsBuilder,
} from '../../../common';

describe('registry', () => {
  describe('getPropsBuilder', () => {
    test('returns default style props builder for unregistered component', () => {
      const propsBuilder = getPropsBuilder(
        'UnregisteredComponent',
        'UnregisteredComponentJS'
      );
      expect(propsBuilder).toBe(stylePropsBuilder);
    });

    test('returns default style props builder for RCT prefixed components', () => {
      const propsBuilder = getPropsBuilder('RCTView', 'View');
      expect(propsBuilder).toBe(stylePropsBuilder);
    });

    test('returns registered props builder for custom component', () => {
      const reactViewName = 'CustomComponent';
      const jsComponentName = 'CustomComponentJS';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(reactViewName, config);
      const propsBuilder = getPropsBuilder(reactViewName, jsComponentName);

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns registered props builder for custom compound component', () => {
      // Compound component name is the combination of reactViewName and jsComponentName
      // It is used for registration of configs that depend not only on the reactViewName,
      // but also on the jsComponentName (e.g. SVG Polygon and Polyline)
      const reactViewName = 'CustomComponent';
      const jsComponentName = 'CustomComponentChild';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(
        getCompoundComponentName(reactViewName, jsComponentName),
        config
      );
      const propsBuilder = getPropsBuilder(reactViewName, jsComponentName);

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('falls back to reactViewName key when looking up with different jsComponentName', () => {
      const reactViewName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(reactViewName, config);
      // jsComponentName can be anything in this getPropsBuilder call, if we have props builder
      // registered for the given reactViewName - we will receive it in this case.
      const propsBuilder = getPropsBuilder(reactViewName, 'DifferentChild');

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns registered props builder using standard config', () => {
      const reactViewName = 'BaseConfigComponent';
      const jsComponentName = 'BaseConfigComponentJS';

      registerComponentPropsBuilder(reactViewName, STYLE_PROPERTIES_CONFIG);
      const propsBuilder = getPropsBuilder(reactViewName, jsComponentName);

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns specific props builder registered for compound component name when getPropsBuilder is called with the appropriate reactViewName and jsComponentName', () => {
      const reactViewName = 'CustomComponent';
      const jsComponentName = 'CustomComponentChild';
      const config = { width: true, height: true };
      const config2 = { width: true, height: true, length: true };

      registerComponentPropsBuilder(reactViewName, config);
      registerComponentPropsBuilder(
        getCompoundComponentName(reactViewName, jsComponentName),
        config2
      );

      const propsBuilder = getPropsBuilder(reactViewName, 'SomeOtherChild');
      const propsBuilder2 = getPropsBuilder(reactViewName, jsComponentName);

      // Both are valid props builders
      expect(typeof propsBuilder.build).toBe('function');
      expect(typeof propsBuilder2.build).toBe('function');
      // But they are not the same props builder, the one registered for jsComponentName
      // is returned for the given reactViewName and jsComponentName pair
      expect(propsBuilder).not.toBe(propsBuilder2);
    });

    test('overwrites existing props builder when registered again', () => {
      const reactViewName = 'OverwriteComponent';
      const jsComponentName = 'OverwriteComponentJS';

      registerComponentPropsBuilder(reactViewName, { width: true });
      const firstBuilder = getPropsBuilder(reactViewName, jsComponentName);

      registerComponentPropsBuilder(reactViewName, { height: true });
      const secondBuilder = getPropsBuilder(reactViewName, jsComponentName);

      expect(secondBuilder).not.toBe(firstBuilder);
      expect(secondBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns default style props builder for unregistered compound component', () => {
      const propsBuilder = getPropsBuilder(
        'UnregisteredComponent',
        'UnregisteredComponentChild'
      );
      expect(propsBuilder).toBe(stylePropsBuilder);
    });
  });

  describe('getSeparatelyInterpolatedNestedProperties', () => {
    test('returns default separately interpolated nested properties for unregistered component', () => {
      const props = getSeparatelyInterpolatedNestedProperties(
        'UnregisteredComponent',
        'UnregisteredComponentJS'
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
      const reactViewName = 'NestedPropsComponent';
      const jsComponentName = 'NestedPropsComponentJS';
      const config = { width: true };
      const nestedProps = ['prop1', 'prop2'];

      registerComponentPropsBuilder(reactViewName, config, {
        separatelyInterpolatedNestedProperties: nestedProps,
      });

      const retrievedProps = getSeparatelyInterpolatedNestedProperties(
        reactViewName,
        jsComponentName
      );
      expect(retrievedProps).toEqual(new Set(nestedProps));
    });
  });
});
