import { act, render } from '@testing-library/react-native';
import { useLayoutEffect } from 'react';
import { View } from 'react-native';

import { LayoutAnimationType, ReduceMotion } from '../src/commonTypes';
import { ReducedMotionConfig } from '../src/component/ReducedMotionConfig';
import { createAnimatedComponent } from '../src/createAnimatedComponent/createAnimatedComponent';
import { ReducedMotionManager } from '../src/ReducedMotion';
import { updateLayoutAnimations } from '../src/UpdateLayoutAnimations';

jest.mock('../src/featureFlags', () => {
  const actual = jest.requireActual('../src/featureFlags');
  return {
    ...actual,
    getStaticFeatureFlag: (name: string) =>
      name === 'ENABLE_SHARED_ELEMENT_TRANSITIONS' ||
      actual.getStaticFeatureFlag(name),
  };
});

jest.mock('../src/UpdateLayoutAnimations', () => ({
  updateLayoutAnimations: jest.fn(),
}));

const AnimatedView = createAnimatedComponent(View);
const calls = jest.mocked(updateLayoutAnimations);
const initialReducedMotion = ReducedMotionManager.jsValue;

beforeEach(() => {
  ReducedMotionManager.setEnabled(false);
  calls.mockClear();
});
afterEach(() => ReducedMotionManager.setEnabled(initialReducedMotion));

test.each([
  [false, ReduceMotion.Always],
  [true, ReduceMotion.Never],
] as const)(
  'applies initial config %s / %s without another render',
  (initial, mode) => {
    ReducedMotionManager.setEnabled(initial);
    render(
      <>
        <ReducedMotionConfig mode={mode} />
        <AnimatedView sharedTransitionTag="tag" />
      </>
    );
    if (mode === ReduceMotion.Always) {
      expect(calls.mock.calls.slice(-4).map(([, type]) => type)).toEqual([
        LayoutAnimationType.SHARED_ELEMENT_TRANSITION_NATIVE_ID,
        LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS_NATIVE_ID,
        LayoutAnimationType.SHARED_ELEMENT_TRANSITION,
        LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS,
      ]);
      expect(
        calls.mock.calls.slice(-4).every(([, , config]) => config === undefined)
      ).toBe(true);
    } else {
      expect(calls.mock.calls.map(([, type]) => type)).toEqual([
        LayoutAnimationType.SHARED_ELEMENT_TRANSITION,
        LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS,
      ]);
      expect(calls.mock.calls[0][2]).toBeDefined();
    }
  }
);

test('refreshes a mounted view without a render and ignores the same value', () => {
  render(<AnimatedView sharedTransitionTag="tag" />);
  calls.mockClear();
  act(() => ReducedMotionManager.setEnabled(true));
  expect(calls).toHaveBeenCalledTimes(4);
  calls.mockClear();
  act(() => ReducedMotionManager.setEnabled(true));
  expect(calls).not.toHaveBeenCalled();
  act(() => ReducedMotionManager.setEnabled(false));
  expect(calls).toHaveBeenCalledTimes(2);
  expect(calls.mock.calls[0][2]).toBeDefined();
});

test('refreshes a value changed before the view subscribes', () => {
  function ChangeMode() {
    useLayoutEffect(() => ReducedMotionManager.setEnabled(true), []);
    return null;
  }
  render(
    <>
      <ChangeMode />
      <AnimatedView sharedTransitionTag="tag" />
    </>
  );
  expect(calls.mock.calls.slice(-4)).toHaveLength(4);
  expect(
    calls.mock.calls.slice(-4).every(([, , config]) => config === undefined)
  ).toBe(true);
});

test('removes subscriptions on tag removal and unmount, with no untagged listener', () => {
  const view = render(<AnimatedView sharedTransitionTag="tag" />);
  expect(ReducedMotionManager.listeners.size).toBe(1);
  view.rerender(<AnimatedView />);
  expect(ReducedMotionManager.listeners.size).toBe(0);
  calls.mockClear();
  act(() => ReducedMotionManager.setEnabled(true));
  expect(calls).not.toHaveBeenCalled();
  view.rerender(<AnimatedView sharedTransitionTag="tag" />);
  expect(ReducedMotionManager.listeners.size).toBe(1);
  view.unmount();
  expect(ReducedMotionManager.listeners.size).toBe(0);
  calls.mockClear();
  act(() => ReducedMotionManager.setEnabled(false));
  expect(calls).not.toHaveBeenCalled();
});
