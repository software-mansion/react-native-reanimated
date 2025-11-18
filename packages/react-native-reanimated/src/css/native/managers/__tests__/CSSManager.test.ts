'use strict';
import { logger } from '../../../../common';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import type { CSSStyle } from '../../../types';
import type { StyleBuilder } from '../../../../common/style';
import CSSAnimationsManager from '../CSSAnimationsManager';
import CSSTransitionsManager from '../CSSTransitionsManager';
import CSSManager from '../CSSManager';
import { setViewStyle } from '../../proxy';
import { getStyleBuilder, hasStyleBuilder } from '../../registry';

jest.mock('../CSSAnimationsManager');
jest.mock('../CSSTransitionsManager');
jest.mock('../../proxy.ts');

const MockAnimationsManager =
  CSSAnimationsManager as jest.MockedClass<typeof CSSAnimationsManager>;
const MockTransitionsManager =
  CSSTransitionsManager as jest.MockedClass<typeof CSSTransitionsManager>;
const setViewStyleMock = setViewStyle as jest.MockedFunction<typeof setViewStyle>;
const hasStyleBuilderMock =
  hasStyleBuilder as jest.MockedFunction<typeof hasStyleBuilder>;
const getStyleBuilderMock =
  getStyleBuilder as jest.MockedFunction<typeof getStyleBuilder>;

const defaultBuildFrom: StyleBuilder['buildFrom'] = () => null;
const defaultAdd: StyleBuilder['add'] = () => undefined;
const defaultIsSeparatelyInterpolatedNestedProperty: StyleBuilder['isSeparatelyInterpolatedNestedProperty'] =
  () => false;

const createStyleBuilderMock = (
  buildFrom?: jest.Mock
): StyleBuilder => ({
  buildFrom: (buildFrom as unknown as StyleBuilder['buildFrom']) ?? defaultBuildFrom,
  add: defaultAdd,
  isSeparatelyInterpolatedNestedProperty:
    defaultIsSeparatelyInterpolatedNestedProperty,
});

type CreateManagerOptions = {
  viewName?: string;
  buildFrom?: jest.Mock;
};

function createManager(
  options: string | CreateManagerOptions = {}
): CSSManager {
  const normalizedOptions: CreateManagerOptions =
    typeof options === 'string' ? { viewName: options } : options;

  const viewName = normalizedOptions.viewName ?? 'RCTView';
  const builder = normalizedOptions.buildFrom
    ? createStyleBuilderMock(normalizedOptions.buildFrom)
    : undefined;

  const hasBuilder = !!builder;
  hasStyleBuilderMock.mockReturnValue(hasBuilder);
  getStyleBuilderMock.mockReturnValue(
    builder ?? createStyleBuilderMock()
  );

  return new CSSManager({
    shadowNodeWrapper: {} as ShadowNodeWrapper,
    viewTag: 1,
    viewName,
  });
}

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
    setViewStyleMock.mockClear();
    hasStyleBuilderMock.mockReset();
    getStyleBuilderMock.mockReset();
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

  test('does not warn for supported props', () => {
    const manager = createManager();
    const style = { transform: [{ translateX: 10 }] };

    manager.update(style);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('shows separate warnings for different unsupported props', () => {
    const manager = createManager();
    const styleA = { translateX: 10 } as CSSStyle;
    const styleB = { scaleX: 0.5 } as CSSStyle;

    manager.update(styleA);
    manager.update(styleB);

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  test('forwards transition properties to the transitions manager', () => {
    const buildFrom = jest.fn().mockReturnValue({ opacity: 0.6 });
    const manager = createManager({ buildFrom });
    const style: CSSStyle = {
      opacity: 0.4,
      transitionDuration: ['150ms'],
      transitionProperty: ['opacity'],
    };

    manager.update(style);

    const transitionsInstance = MockTransitionsManager.mock.instances[0]!;
    expect(transitionsInstance.update).toHaveBeenCalledWith({
      transitionDuration: ['150ms'],
      transitionProperty: ['opacity'],
    });
    expect(buildFrom).toHaveBeenCalledWith({ opacity: 0.4 });
    expect(setViewStyleMock).toHaveBeenCalledWith(1, { opacity: 0.6 });
  });

  test('calls animation and transition managers with null when no configs provided', () => {
    const manager = createManager();

    manager.update({ opacity: 0.2 });

    const animationsInstance = MockAnimationsManager.mock.instances[0]!;
    const transitionsInstance = MockTransitionsManager.mock.instances[0]!;
    expect(animationsInstance.update).toHaveBeenCalledWith(null);
    expect(transitionsInstance.update).toHaveBeenCalledWith(null);
    expect(setViewStyleMock).not.toHaveBeenCalled();
  });

  test('sets styles before transitions on first update and after on subsequent updates', () => {
    const buildFrom = jest.fn().mockReturnValue({ opacity: 0.7 });
    const manager = createManager({ buildFrom });
    const animationsInstance = MockAnimationsManager.mock.instances[0]!;
    const transitionsInstance = MockTransitionsManager.mock.instances[0]!;

    manager.update({ opacity: 0.5 });

    expect(setViewStyleMock).toHaveBeenCalledTimes(1);
    expect(setViewStyleMock.mock.invocationCallOrder[0]).toBeLessThan(
      (transitionsInstance.update as jest.Mock).mock.invocationCallOrder[0]
    );

    setViewStyleMock.mockClear();
    (animationsInstance.update as jest.Mock).mockClear();
    (transitionsInstance.update as jest.Mock).mockClear();

    manager.update({ opacity: 0.9 });

    expect(setViewStyleMock).toHaveBeenCalledTimes(1);
    expect(setViewStyleMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      (animationsInstance.update as jest.Mock).mock.invocationCallOrder[0]
    );
  });

  test('delegates unmountCleanup to both managers', () => {
    const manager = createManager();
    const animationsInstance = MockAnimationsManager.mock.instances[0]!;
    const transitionsInstance = MockTransitionsManager.mock.instances[0]!;

    manager.unmountCleanup();

    expect(animationsInstance.unmountCleanup).toHaveBeenCalledTimes(1);
    expect(transitionsInstance.unmountCleanup).toHaveBeenCalledTimes(1);
  });

  test('throws when animations are provided without a style builder', () => {
    const manager = createManager();
    const style = {
      animationDuration: ['1s'],
      animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    } as CSSStyle;

    expect(() => manager.update(style)).toThrow(
      'Tried to apply CSS animations to RCTView which is not supported'
    );
  });
});
