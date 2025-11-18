'use strict';
import { logger } from '../../../../common';
import type { ViewInfo } from '../../../../createAnimatedComponent/commonTypes';
import type { CSSStyle } from '../../../types';
import CSSAnimationsManager from '../CSSAnimationsManager';
import CSSTransitionsManager from '../CSSTransitionsManager';
import CSSManager from '../CSSManager';

jest.mock('../CSSAnimationsManager');
jest.mock('../CSSTransitionsManager');

const MockAnimationsManager =
  CSSAnimationsManager as jest.MockedClass<typeof CSSAnimationsManager>;
const MockTransitionsManager =
  CSSTransitionsManager as jest.MockedClass<typeof CSSTransitionsManager>;

describe('CSSManager', () => {
  const warnSpy = jest
    .spyOn(logger, 'warn')
    .mockImplementation(() => undefined);

  beforeAll(() => {
    // @ts-expect-error allow assigning to global
    global.__DEV__ = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    MockAnimationsManager.mockClear();
    MockTransitionsManager.mockClear();
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

  test('shows separate warnings for different unsupported props', () => {
    const manager = createManager('RCTView');
    const first = { translateY: 5 } as CSSStyle;
    const second = { scaleX: 2 } as CSSStyle;

    manager.update(first);
    manager.update(second);

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  test('passes animation and transition config to respective managers', () => {
    const manager = createManager('RCTView');
    const style: CSSStyle = {
      animationDuration: ['1s'],
      animationName: [{ from: { opacity: 0 }, to: { opacity: 1 } }],
      transitionDuration: ['150ms'],
      transitionProperty: ['opacity'],
      opacity: 0.5,
    };

    manager.update(style);

    const animationsInstance = MockAnimationsManager.mock.instances[0]!;
    const transitionsInstance = MockTransitionsManager.mock.instances[0]!;
    expect(animationsInstance.update).toHaveBeenCalledWith({
      animationDuration: ['1s'],
      animationName: expect.any(Array),
    });
    expect(transitionsInstance.update).toHaveBeenCalledWith({
      transitionDuration: ['150ms'],
      transitionProperty: ['opacity'],
    });
  });

  test('sends null to managers when no configs present', () => {
    const manager = createManager('RCTView');

    manager.update({ opacity: 0.3 });

    const animationsInstance = MockAnimationsManager.mock.instances[0]!;
    const transitionsInstance = MockTransitionsManager.mock.instances[0]!;
    expect(animationsInstance.update).toHaveBeenCalledWith(null);
    expect(transitionsInstance.update).toHaveBeenCalledWith(null);
  });

  test('delegates unmountCleanup to both managers', () => {
    const manager = createManager('RCTView');
    const animationsInstance = MockAnimationsManager.mock.instances[0]!;
    const transitionsInstance = MockTransitionsManager.mock.instances[0]!;

    manager.unmountCleanup();

    expect(animationsInstance.unmountCleanup).toHaveBeenCalledTimes(1);
    expect(transitionsInstance.unmountCleanup).toHaveBeenCalledTimes(1);
  });
});
