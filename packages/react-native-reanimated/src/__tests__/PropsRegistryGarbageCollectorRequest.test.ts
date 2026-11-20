'use strict';
import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
import type * as CollectorModuleNamespace from '../PropsRegistryGarbageCollector.native';

type Updater = boolean | ((value: boolean) => boolean);

const mockScheduledCallbacks: (() => void)[] = [];
const mockScheduleOnRN = jest.fn((callback: () => void) => {
  mockScheduledCallbacks.push(callback);
});

jest.mock('react-native-worklets', () => ({
  createSynchronizable: (initialValue: boolean) => {
    let value = initialValue;
    return {
      setBlocking: (updater: Updater) => {
        value = typeof updater === 'function' ? updater(value) : updater;
      },
      getBlocking: () => value,
    };
  },
  scheduleOnRN: (callback: () => void) => mockScheduleOnRN(callback),
}));

jest.mock('../common', () => ({
  ...jest.requireActual<object>('../common'),
  IS_JEST: false,
}));

jest.mock('../featureFlags', () => ({
  getStaticFeatureFlag: (name: string) =>
    name === 'FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS',
}));

jest.mock('../ReanimatedModule', () => ({
  ReanimatedModule: {
    getSettledUpdates: jest.fn(() => []),
    hasPendingSettledUpdates: jest.fn(() => false),
  },
}));

const FLUSH_INTERVAL_MS = 500;
const VIEW_TAG = 7;
const WRITES = 12;

type CollectorModule = typeof CollectorModuleNamespace;

describe('settled props sync requests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockScheduleOnRN.mockClear();
    mockScheduledCallbacks.length = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('coalesces requests while no view is registered', () => {
    const collector = loadCollector();

    for (let write = 0; write < WRITES; write++) {
      writeAndRunOnRN(collector);
    }

    expect(mockScheduleOnRN).toHaveBeenCalledTimes(1);
    expect(collector.PropsRegistryGarbageCollector.intervalId).toBeNull();
  });

  test('accepts a new request after a registered view was synced', () => {
    const collector = loadCollector();
    const { PropsRegistryGarbageCollector } = collector;
    writeAndRunOnRN(collector);

    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      {} as IAnimatedComponentInternal
    );
    jest.advanceTimersByTime(FLUSH_INTERVAL_MS);
    writeAndRunOnRN(collector);

    expect(mockScheduleOnRN).toHaveBeenCalledTimes(2);
    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);
  });
});

function loadCollector(): CollectorModule {
  let collectorModule: CollectorModule | undefined;
  jest.isolateModules(() => {
    collectorModule = jest.requireActual<CollectorModule>(
      '../PropsRegistryGarbageCollector.native'
    );
  });
  return collectorModule!;
}

function writeAndRunOnRN(collector: CollectorModule) {
  collector.requestSettledPropsSync();
  runScheduledCallbacks();
}

function runScheduledCallbacks() {
  while (mockScheduledCallbacks.length > 0) {
    mockScheduledCallbacks.shift()!();
  }
}
