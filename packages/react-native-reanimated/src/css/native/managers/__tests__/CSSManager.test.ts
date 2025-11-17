'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import { logger } from '../../../../common';
import type { CSSStyle } from '../../../types';
import CSSManager from '../CSSManager';

const createManager = (viewName = 'RCTView') =>
  new CSSManager({
    shadowNodeWrapper: {} as ShadowNodeWrapper,
    viewTag: 1,
    viewName,
  });

describe('CSSManager warning', () => {
  const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

  beforeAll(() => {
    // @ts-expect-error allow assigning to global
    global.__DEV__ = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('warns once per unsupported prop for React Native components', () => {
    const manager = createManager();
    const style = { translateX: 10 } as CSSStyle;

    manager.update(style);
    manager.update(style);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'The style property "translateX" is not supported for RCTView CSS animations. Use the "transform" property instead.'
    );
  });

  test('does not warn for non React Native components', () => {
    const manager = createManager('Div');
    const style = { translateX: 10 } as CSSStyle;

    manager.update(style);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('ignores supported props', () => {
    const manager = createManager();
    const style = { transform: [{ translateX: 10 }] };

    manager.update(style);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('resets warnings for different unsupported props', () => {
    const manager = createManager();
    const styleA = { translateX: 10 } as CSSStyle;
    const styleB = { scaleX: 0.5 } as CSSStyle;

    manager.update(styleA);
    manager.update(styleB);

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
