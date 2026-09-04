import { LayoutAnimationType } from '../src/commonTypes';
import { configureLayoutAnimationBatch } from '../src/core';
import { initializeLayoutAnimationsManager } from '../src/layoutReanimation/animationsManager.native';
import { updateLayoutAnimations } from '../src/UpdateLayoutAnimations.native';

jest.mock('react-native-worklets', () => ({
  createSerializable: jest.fn((value) => value),
}));
jest.mock('../src/core', () => ({
  configureLayoutAnimationBatch: jest.fn(),
}));
jest.mock('../src/layoutReanimation/animationsManager.native', () => ({
  initializeLayoutAnimationsManager: jest.fn(),
}));

describe('UpdateLayoutAnimations', () => {
  test('initializes the UI manager before configuring native', () => {
    updateLayoutAnimations(1, LayoutAnimationType.ENTERING);

    expect(initializeLayoutAnimationsManager).toHaveBeenCalledTimes(1);
    expect(configureLayoutAnimationBatch).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(initializeLayoutAnimationsManager).mock.invocationCallOrder[0]
    ).toBeLessThan(
      jest.mocked(configureLayoutAnimationBatch).mock.invocationCallOrder[0]
    );
  });
});
