import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import { LayoutAnimationType } from '../src/commonTypes';
import { LayoutAnimationConfig } from '../src/component/LayoutAnimationConfig';
import { createAnimatedComponent } from '../src/createAnimatedComponent/createAnimatedComponent';
import { FadeIn } from '../src/layoutReanimation';
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

function registeredTypes() {
  return jest
    .mocked(updateLayoutAnimations)
    .mock.calls.filter(([, , config]) => config !== undefined)
    .map(([, type]) => type);
}

beforeEach(() => jest.mocked(updateLayoutAnimations).mockClear());

describe('Shared transition registration', () => {
  test('registers by native ID before the first mount', () => {
    render(<AnimatedView sharedTransitionTag="tag" />);
    expect(registeredTypes()).toEqual([
      LayoutAnimationType.SHARED_ELEMENT_TRANSITION_NATIVE_ID,
      LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS_NATIVE_ID,
    ]);
  });

  test('registers by native ID and skips entering inside LayoutAnimationConfig skipEntering', () => {
    render(
      <LayoutAnimationConfig skipEntering>
        <AnimatedView sharedTransitionTag="tag" entering={FadeIn} />
      </LayoutAnimationConfig>
    );
    expect(registeredTypes()).toEqual([
      LayoutAnimationType.SHARED_ELEMENT_TRANSITION_NATIVE_ID,
      LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS_NATIVE_ID,
    ]);
  });

  test('registers by view tag when the view has its own nativeID', () => {
    render(<AnimatedView sharedTransitionTag="tag" nativeID="hero" />);
    expect(registeredTypes()).toEqual([
      LayoutAnimationType.SHARED_ELEMENT_TRANSITION,
      LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS,
    ]);
  });
});
