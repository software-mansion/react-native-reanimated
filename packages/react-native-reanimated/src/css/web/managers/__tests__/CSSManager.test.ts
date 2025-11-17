'use strict';
import { ViewInfo } from '../../../../createAnimatedComponent/commonTypes';
import { logger } from '../../../../common';
import type { CSSStyle } from '../../../types';
import CSSManager from '../CSSManager';

describe('web CSSManager warning', () => {
  const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

  beforeAll(() => {
    // @ts-expect-error allow assigning to global
    global.__DEV__ = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createManager = (viewName = 'RCTView') =>
    new CSSManager({
      DOMElement: { style: {}, tagName: 'div' },
      viewTag: 1,
      viewName,
    } as ViewInfo);

  test('warns once per prop for React Native view names', () => {
    const manager = createManager('RCTView');
    const style = { translateY: 5 } as CSSStyle;

    manager.update(style);
    manager.update(style);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'The style property "translateY" is not supported for RCTView CSS animations. Use the "transform" property instead.'
    );
  });

  test('skips warning for non React Native views', () => {
    const manager = createManager('div');
    const style = { translateY: 5 } as CSSStyle;

    manager.update(style);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('does not warn for supported props', () => {
    const manager = createManager('RCTView');
    const style = { transform: [{ rotate: '5deg' }] };

    manager.update(style);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('resets warning for different unsupported props', () => {
    const manager = createManager('RCTView');
    const first = { translateY: 5 } as CSSStyle;
    const second = { scaleX: 2 } as CSSStyle;

    manager.update(first);
    manager.update(second);

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
