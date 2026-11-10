import { View } from 'react-native';

import { logger } from '../src/common';
import { LayoutAnimationType } from '../src/commonTypes';
import AnimatedComponent from '../src/createAnimatedComponent/AnimatedComponent';
import { FadeIn } from '../src/layoutReanimation';
import { updateLayoutAnimations } from '../src/UpdateLayoutAnimations';

jest.mock('../src/UpdateLayoutAnimations', () => ({
  updateLayoutAnimations: jest.fn(),
}));

function enteringRegistrations() {
  return jest
    .mocked(updateLayoutAnimations)
    .mock.calls.filter(([, type]) => type === LayoutAnimationType.ENTERING);
}

function construct(props: { nativeID?: string | null }) {
  return new AnimatedComponent(View, { entering: FadeIn, ...props }, 'View');
}

describe('Entering animation registration', () => {
  beforeEach(() => jest.mocked(updateLayoutAnimations).mockClear());

  test('registers by the Reanimated native ID', () => {
    const component = construct({});
    expect(enteringRegistrations()).toEqual([
      [component.reanimatedID, LayoutAnimationType.ENTERING, expect.anything()],
    ]);
  });

  test.each([undefined, null])('registers when nativeID is %s', (nativeID) => {
    construct({ nativeID });
    expect(enteringRegistrations()).toHaveLength(1);
  });

  test('does not register when the component has its own nativeID', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation();
    construct({ nativeID: 'custom' });
    expect(enteringRegistrations()).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
