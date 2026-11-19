'use strict';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
import { PropsRegistryGarbageCollector } from '../PropsRegistryGarbageCollector';
import { ReanimatedModule } from '../ReanimatedModule';

jest.mock('../ReanimatedModule', () => ({
  ReanimatedModule: {
    getSettledUpdates: jest.fn(),
  },
}));

const getSettledUpdates = ReanimatedModule.getSettledUpdates as jest.Mock;

const VIEW_TAG = 7;
const FLUSH_INTERVAL_MS = 500;

const component = {
  _syncStylePropsBackToReact: jest.fn(),
} as unknown as IAnimatedComponentInternal;

describe('PropsRegistryGarbageCollector app state handling', () => {
  let emitAppStateChange: (state: AppStateStatus) => void;
  let removeSubscription: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    getSettledUpdates.mockReset();
    getSettledUpdates.mockReturnValue([]);
    removeSubscription = jest.fn();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, listener) => {
        emitAppStateChange = listener as (state: AppStateStatus) => void;
        return { remove: removeSubscription };
      });
  });

  afterEach(() => {
    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('flushes on an interval while the app is active', () => {
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);

    jest.advanceTimersByTime(FLUSH_INTERVAL_MS * 2);

    expect(getSettledUpdates).toHaveBeenCalledTimes(2);
  });

  test.each(['inactive', 'background'] as const)(
    'stops flushing while the app is %s',
    (state) => {
      PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);

      emitAppStateChange(state);
      jest.advanceTimersByTime(FLUSH_INTERVAL_MS * 4);

      expect(getSettledUpdates).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    }
  );

  test('flushes immediately and resumes when the app becomes active again', () => {
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);
    emitAppStateChange('inactive');

    emitAppStateChange('active');
    expect(getSettledUpdates).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(FLUSH_INTERVAL_MS);
    expect(getSettledUpdates).toHaveBeenCalledTimes(2);
  });

  test('does not start a second interval on repeated active events', () => {
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);

    emitAppStateChange('active');
    emitAppStateChange('active');

    expect(jest.getTimerCount()).toBe(1);
  });

  test('removes the app state listener when the last view unregisters', () => {
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);

    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);

    expect(removeSubscription).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
