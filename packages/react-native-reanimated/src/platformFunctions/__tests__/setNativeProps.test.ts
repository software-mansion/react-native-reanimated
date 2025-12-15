'use strict';
import { RuntimeKind } from 'react-native-worklets';

import { logger, processColor, processTransform } from '../../common';
import type { ShadowNodeWrapper } from '../../commonTypes';
import { setNativePropsNative } from '../setNativeProps';

describe(setNativePropsNative, () => {
  const mockShadowNodeWrapper: ShadowNodeWrapper = {} as ShadowNodeWrapper;
  const mockAnimatedRef = jest.fn(() => mockShadowNodeWrapper);
  const mockUpdateProps: jest.Mock = jest.fn();

  beforeAll(() => {
    global._updateProps = mockUpdateProps;
    globalThis.__RUNTIME_KIND = RuntimeKind.UI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('processes style props and includes unprocessed props', () => {
    const updates = {
      backgroundColor: 'red', // style prop (color) - should be processed
      transform: 'translateX(100px) perspective(0) rotate(45deg)', // style prop (transform) - should be processed
      testProp: 'testValue', // non-style prop - should be included
      customProp: 123, // non-style prop - should be included
    };

    setNativePropsNative(mockAnimatedRef, updates);

    expect(mockUpdateProps).toHaveBeenCalledWith([
      {
        shadowNodeWrapper: mockShadowNodeWrapper,
        updates: expect.objectContaining({
          backgroundColor: processColor(updates.backgroundColor),
          transform: processTransform(updates.transform),
          testProp: 'testValue', // included unprocessed
          customProp: 123, // included unprocessed
        }),
      },
    ]);
  });

  test('returns early when called on ReactNative runtime', () => {
    const warnSpy = jest.spyOn(logger, 'warn');
    globalThis.__RUNTIME_KIND = RuntimeKind.ReactNative;

    setNativePropsNative(mockAnimatedRef, { backgroundColor: 'red' });

    expect(warnSpy).toHaveBeenCalledWith(
      'setNativeProps() can only be used on the UI runtime.'
    );
    expect(mockUpdateProps).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
