import { View } from 'react-native';

import { LayoutAnimationType } from '../src/commonTypes';
import AnimatedComponent from '../src/createAnimatedComponent/AnimatedComponent';
import { SharedTransition } from '../src/layoutReanimation';
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
  beforeEach(() => jest.mocked(updateLayoutAnimations).mockClear());

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
