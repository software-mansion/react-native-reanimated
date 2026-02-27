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
        getCompoundComponentName(
          'UnregisteredComponent',
          'UnregisteredComponentJS'
        )
      );
      expect(propsBuilder).toBe(stylePropsBuilder);
    });

    test('returns default style props builder for RCT prefixed components', () => {
      const propsBuilder = getPropsBuilder(
        getCompoundComponentName('RCTView', 'View')
      );
      expect(propsBuilder).toBe(stylePropsBuilder);
    });

    test('returns registered props builder for custom component', () => {
      const reactViewName = 'CustomComponent';
      const componentDisplayName = 'CustomComponentJS';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(reactViewName, config);
      const propsBuilder = getPropsBuilder(
        getCompoundComponentName(reactViewName, componentDisplayName)
      );

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns registered props builder for custom compound component', () => {
      // Compound component name is the combination of reactViewName and componentDisplayName
      // It is used for registration of configs that depend not only on the reactViewName,
      // but also on the componentDisplayName (e.g. SVG Polygon and Polyline)
      const reactViewName = 'CustomComponent';
      const componentDisplayName = 'CustomComponentChild';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(
        getCompoundComponentName(reactViewName, componentDisplayName),
        config
      );
      const propsBuilder = getPropsBuilder(
        getCompoundComponentName(reactViewName, componentDisplayName)
      );

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('falls back to reactViewName key when looking up with different componentDisplayName', () => {
      const reactViewName = 'CustomComponent';
      const config = { width: true, height: true };

      registerComponentPropsBuilder(reactViewName, config);
      // componentDisplayName can be anything in this getPropsBuilder call, if we have props builder
      // registered for the given reactViewName - we will receive it in this case.
      const propsBuilder = getPropsBuilder(
        getCompoundComponentName(reactViewName, 'DifferentChild')
      );

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns registered props builder using standard config', () => {
      const reactViewName = 'BaseConfigComponent';
      const componentDisplayName = 'BaseConfigComponentJS';

      registerComponentPropsBuilder(reactViewName, STYLE_PROPERTIES_CONFIG);
      const propsBuilder = getPropsBuilder(
        getCompoundComponentName(reactViewName, componentDisplayName)
      );

      expect(typeof propsBuilder.build).toBe('function');
      expect(propsBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns specific props builder registered for compound component name when getPropsBuilder is called with the appropriate reactViewName and componentDisplayName', () => {
      const reactViewName = 'CustomComponent';
      const componentDisplayName = 'CustomComponentChild';
      const config = { width: true, height: true };
      const config2 = { width: true, height: true, length: true };

      registerComponentPropsBuilder(reactViewName, config);
      registerComponentPropsBuilder(
        getCompoundComponentName(reactViewName, componentDisplayName),
        config2
      );

      const propsBuilder = getPropsBuilder(
        getCompoundComponentName(reactViewName, 'SomeOtherChild')
      );
      const propsBuilder2 = getPropsBuilder(
        getCompoundComponentName(reactViewName, componentDisplayName)
      );

      // Both are valid props builders
      expect(typeof propsBuilder.build).toBe('function');
      expect(typeof propsBuilder2.build).toBe('function');
      // But they are not the same props builder, the one registered for componentDisplayName
      // is returned for the given reactViewName and componentDisplayName pair
      expect(propsBuilder).not.toBe(propsBuilder2);
    });

    test('overwrites existing props builder when registered again', () => {
      const reactViewName = 'OverwriteComponent';
      const componentDisplayName = 'OverwriteComponentJS';

      registerComponentPropsBuilder(reactViewName, { width: true });
      const firstBuilder = getPropsBuilder(
        getCompoundComponentName(reactViewName, componentDisplayName)
      );

      registerComponentPropsBuilder(reactViewName, { height: true });
      const secondBuilder = getPropsBuilder(
        getCompoundComponentName(reactViewName, componentDisplayName)
      );

      expect(secondBuilder).not.toBe(firstBuilder);
      expect(secondBuilder).not.toBe(stylePropsBuilder);
    });

    test('returns default style props builder for unregistered compound component', () => {
      const propsBuilder = getPropsBuilder(
        getCompoundComponentName(
          'UnregisteredComponent',
          'UnregisteredComponentChild'
        )
      );
      expect(propsBuilder).toBe(stylePropsBuilder);
    });
  });

  describe('getSeparatelyInterpolatedNestedProperties', () => {
    test('returns default separately interpolated nested properties for unregistered component', () => {
      const props = getSeparatelyInterpolatedNestedProperties(
        getCompoundComponentName(
          'UnregisteredComponent',
          'UnregisteredComponentJS'
        )
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
      const componentDisplayName = 'NestedPropsComponentJS';
      const config = { width: true };
      const nestedProps = ['prop1', 'prop2'];

      registerComponentPropsBuilder(reactViewName, config, {
        separatelyInterpolatedNestedProperties: nestedProps,
      });

      const retrievedProps = getSeparatelyInterpolatedNestedProperties(
        getCompoundComponentName(reactViewName, componentDisplayName)
      );
      expect(retrievedProps).toEqual(new Set(nestedProps));
    });
  });
});
