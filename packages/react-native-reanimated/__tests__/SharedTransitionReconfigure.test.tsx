import { View } from 'react-native';

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
    expect(updateLayoutAnimations).toHaveBeenCalledTimes(1);
  });

  test('registers again when fadeContent() changes the same transition', () => {
    const transition = SharedTransition.duration(400);
    const component = mountWith(transition);
    transition.fadeContent();
    component._configureSharedTransition(true);
    expect(updateLayoutAnimations).toHaveBeenCalledTimes(2);
    expect(jest.mocked(updateLayoutAnimations).mock.lastCall?.[5]).toEqual(
      expect.anything()
    );
  });
});
