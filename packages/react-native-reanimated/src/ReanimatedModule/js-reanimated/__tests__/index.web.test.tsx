'use strict';

import { _updatePropsJS } from '../index';
import * as webUtils from '../webUtils';

describe('web style helpers (#9844)', () => {
  test('react-native-web style helpers are loaded on web', () => {
    expect(typeof webUtils.createReactDOMStyle).toBe('function');
    expect(typeof webUtils.createTransformValue).toBe('function');
    expect(typeof webUtils.createTextShadowValue).toBe('function');
  });

  test('the dist/cjs import() fallback specifiers resolve', () => {
    const fallbackSpecifiers = [
      'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js',
      'react-native-web/dist/cjs/exports/StyleSheet/preprocess.js',
    ];
    for (const specifier of fallbackSpecifiers) {
      expect(() => require.resolve(specifier)).not.toThrow();
    }
  });
});

describe('_updatePropsJS (#9854)', () => {
  test('does not throw on a ref without setNativeProps, style or props', () => {
    // Shape of a react-native-gifted-chat useAnimatedKeyboard ref on web.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => _updatePropsJS({ opacity: 1 }, {} as any)).not.toThrow();
  });

  test('applies animated styles to a DOM element', () => {
    const element = document.createElement('div');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _updatePropsJS({ opacity: 0.5 } as any, element as any);
    expect(element.style.opacity).toBe('0.5');
  });

  test('applies a falsy update (0) via _touchableNode instead of dropping it', () => {
    const setAttribute = jest.fn();
    const component = {
      props: { opacity: 1 },
      _touchableNode: { setAttribute },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _updatePropsJS({ opacity: 0 } as any, component as any);
    expect(setAttribute).toHaveBeenCalledWith('opacity', 0);
  });
});
