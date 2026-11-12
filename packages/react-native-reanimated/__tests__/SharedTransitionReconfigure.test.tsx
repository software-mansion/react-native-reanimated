import { View } from 'react-native';

import { LayoutAnimationType, ReduceMotion } from '../src/commonTypes';
import AnimatedComponent from '../src/createAnimatedComponent/AnimatedComponent.native';
import { SharedTransition } from '../src/layoutReanimation';
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

function sharedTransitionRegistrations() {
  return jest
    .mocked(updateLayoutAnimations)
    .mock.calls.filter(
      ([, type]) =>
        type === LayoutAnimationType.SHARED_ELEMENT_TRANSITION ||
        type === LayoutAnimationType.SHARED_ELEMENT_TRANSITION_NATIVE_ID
    );
}

function mountWith(sharedTransitionStyle: SharedTransition) {
  return new AnimatedComponent(
    View,
    { sharedTransitionTag: 'tag', sharedTransitionStyle },
    'View'
  );
}

describe('Shared transition registration', () => {
  const initialReducedMotion = ReducedMotionManager.jsValue;

  beforeEach(() => {
    jest.mocked(updateLayoutAnimations).mockClear();
    ReducedMotionManager.setEnabled(false);
  });

  afterEach(() => ReducedMotionManager.setEnabled(initialReducedMotion));

  test('does not register a default transition when reduced motion is enabled', () => {
    ReducedMotionManager.setEnabled(true);
    new AnimatedComponent(View, { sharedTransitionTag: 'tag' }, 'View');
    expect(updateLayoutAnimations).not.toHaveBeenCalled();
  });

  test('keeps an excluded builder when only the style prop is removed', () => {
    const component = mountWith(
      SharedTransition.reduceMotion(ReduceMotion.Always)
    );
    Object.assign(component, { props: { sharedTransitionTag: 'tag' } });
    component._configureSharedTransition(true);
    expect(updateLayoutAnimations).not.toHaveBeenCalled();
  });

  test.each([
    [ReduceMotion.System, true, 0],
    [ReduceMotion.System, false, 1],
    [ReduceMotion.Always, false, 0],
    [ReduceMotion.Never, true, 1],
  ] as const)(
    'registers policy %s with reduced motion %s',
    (policy, enabled, count) => {
      ReducedMotionManager.setEnabled(enabled);
      mountWith(SharedTransition.reduceMotion(policy));
      expect(sharedTransitionRegistrations()).toHaveLength(count);
    }
  );

  test.each([true, false])(
    'updates registration after a render with native ID %s',
    (useNativeId) => {
      const component = mountWith(
        SharedTransition.reduceMotion(ReduceMotion.System)
      );
      jest.mocked(updateLayoutAnimations).mockClear();
      ReducedMotionManager.setEnabled(true);
      component._configureSharedTransition(useNativeId);
      const removals = jest.mocked(updateLayoutAnimations).mock.calls;
      expect(removals).toHaveLength(2);
      expect(removals.map(([, type]) => type)).toEqual(
        useNativeId
          ? [
              LayoutAnimationType.SHARED_ELEMENT_TRANSITION_NATIVE_ID,
              LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS_NATIVE_ID,
            ]
          : [
              LayoutAnimationType.SHARED_ELEMENT_TRANSITION,
              LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS,
            ]
      );
      expect(removals.every(([, , config]) => config === undefined)).toBe(true);
      component._configureSharedTransition(useNativeId);
      expect(removals).toHaveLength(2);
      jest.mocked(updateLayoutAnimations).mockClear();
      ReducedMotionManager.setEnabled(false);
      component._configureSharedTransition(useNativeId);
      expect(sharedTransitionRegistrations()).toHaveLength(1);
      expect(sharedTransitionRegistrations()[0][2]).toBeDefined();
    }
  );

  test('does not register the same transition again', () => {
    const component = mountWith(SharedTransition.duration(400));
    component._configureSharedTransition(true);
    expect(sharedTransitionRegistrations()).toHaveLength(1);
  });

  test('registers again when fadeContent() changes the same transition', () => {
    const transition = SharedTransition.duration(400);
    const component = mountWith(transition);
    transition.fadeContent();
    component._configureSharedTransition(true);
    const registrations = sharedTransitionRegistrations();
    expect(registrations).toHaveLength(2);
    expect(registrations.at(-1)?.[5]).toEqual(expect.anything());
  });
});
