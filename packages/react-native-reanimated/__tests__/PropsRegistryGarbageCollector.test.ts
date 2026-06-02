'use strict';

import { AppState } from 'react-native';

import { PropsRegistryGarbageCollector } from '../src/PropsRegistryGarbageCollector';
import { ReanimatedModule } from '../src/ReanimatedModule';

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('../src/ReanimatedModule', () => ({
  ReanimatedModule: {
    getSettledUpdates: jest.fn(),
  },
}));

describe('PropsRegistryGarbageCollector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PropsRegistryGarbageCollector.viewsMap.clear();
    PropsRegistryGarbageCollector.viewsCount = 0;
    PropsRegistryGarbageCollector.unregisterInterval();
  });

  afterEach(() => {
    PropsRegistryGarbageCollector.viewsMap.clear();
    PropsRegistryGarbageCollector.viewsCount = 0;
    PropsRegistryGarbageCollector.unregisterInterval();
  });

  it('syncs settled props immediately when app becomes active', () => {
    const removeMock = jest.fn();
    let onAppStateChange: ((state: string) => void) | undefined;
    const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');

    addEventListenerSpy.mockImplementation(
      (_eventType: string, listener: (state: string) => void) => {
        onAppStateChange = listener;
        return { remove: removeMock };
      }
    );

    (ReanimatedModule.getSettledUpdates as jest.Mock).mockReturnValue([
      {
        viewTag: 101,
        styleProps: { opacity: 1 },
      },
    ]);
    const component = {
      _syncStylePropsBackToReact: jest.fn(),
    };

    PropsRegistryGarbageCollector.registerView(101, component);

    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));

    onAppStateChange?.('active');

    expect(ReanimatedModule.getSettledUpdates as jest.Mock).toHaveBeenCalledTimes(1);
    expect(component._syncStylePropsBackToReact).toHaveBeenCalledWith({
      opacity: 1,
    });

    PropsRegistryGarbageCollector.unregisterInterval();
    expect(removeMock).toHaveBeenCalledTimes(1);
  });
});
