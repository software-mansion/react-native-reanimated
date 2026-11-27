import { render } from '@testing-library/react-native';
import type * as ReactModule from 'react';
import type * as ReactNativeModule from 'react-native';
import { RefreshControl } from 'react-native';

import Animated, { makeMutable } from '../src';
import { WorkletEventHandler } from '../src/WorkletEventHandler';

jest.mock('../src/platformFunctions/findNodeHandle', () => {
  const tags = new Map<unknown, number>();
  return {
    findNodeHandle: jest.fn((instance: unknown) => {
      if (!tags.has(instance)) {
        tags.set(instance, tags.size + 1);
      }
      return tags.get(instance);
    }),
  };
});

jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const { createElement } = jest.requireActual<typeof ReactModule>('react');
  const { View } = jest.requireActual<typeof ReactNativeModule>('react-native');
  function MockAndroidScrollView({
    ref,
    refreshControl,
  }: {
    ref?: unknown;
    refreshControl?: unknown;
  }) {
    const scrollView = createElement(View, { ref });
    return refreshControl ? createElement(View, null, scrollView) : scrollView;
  }
  return { __esModule: true, default: MockAndroidScrollView };
});

describe('Animated.ScrollView scrollViewOffset on Android', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('follows the scroll view that replaces it when refreshControl is added', () => {
    const registerForEvents = jest.spyOn(
      WorkletEventHandler.prototype,
      'registerForEvents'
    );
    const offset = makeMutable(0);
    const { rerender } = render(
      <Animated.ScrollView scrollViewOffset={offset} />
    );
    const [[firstTag]] = registerForEvents.mock.calls;

    rerender(
      <Animated.ScrollView
        scrollViewOffset={offset}
        refreshControl={<RefreshControl refreshing={false} />}
      />
    );

    expect(registerForEvents).toHaveBeenCalledTimes(2);
    expect(registerForEvents.mock.lastCall?.[0]).not.toBe(firstTag);
  });
});
