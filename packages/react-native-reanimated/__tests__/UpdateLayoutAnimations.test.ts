import { LayoutAnimationType } from '../src/commonTypes';
import { configureLayoutAnimationBatch } from '../src/core';
import { updateLayoutAnimations } from '../src/UpdateLayoutAnimations.native';

jest.mock('react-native-worklets', () =>
  jest.requireActual('../../react-native-worklets/src/mock')
);
jest.mock('../src/core', () => ({ configureLayoutAnimationBatch: jest.fn() }));
jest.mock('../src/layoutReanimation/animationsManager', () => ({
  initializeLayoutAnimationsManager: jest.fn(),
}));

const configure = configureLayoutAnimationBatch as jest.Mock;

describe('updateLayoutAnimations', () => {
  test('configures the next update after a rejected one', () => {
    const error = new Error(
      '[Reanimated] `sharedTransitionTag` must be a string.'
    );
    configure.mockImplementationOnce(() => {
      throw error;
    });

    expect(() =>
      updateLayoutAnimations(
        1,
        LayoutAnimationType.SHARED_ELEMENT_TRANSITION,
        undefined,
        undefined,
        7 as unknown as string
      )
    ).toThrow(error);
    updateLayoutAnimations(2, LayoutAnimationType.LAYOUT);

    expect(configure).toHaveBeenLastCalledWith([
      expect.objectContaining({ viewTag: 2 }),
    ]);
  });
});
