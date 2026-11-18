'use strict';
import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
import { PropsRegistryGarbageCollector } from '../PropsRegistryGarbageCollector';
import { ReanimatedModule } from '../ReanimatedModule';

jest.mock('../ReanimatedModule', () => ({
  ReanimatedModule: {
    getSettledUpdates: jest.fn(),
    hasPendingSettledUpdates: jest.fn(),
    setDynamicFeatureFlag: jest.fn(),
    getStaticFeatureFlag: jest.fn(() => false),
  },
}));

const getSettledUpdates = ReanimatedModule.getSettledUpdates as jest.Mock;
const hasPendingSettledUpdates =
  ReanimatedModule.hasPendingSettledUpdates as jest.Mock;

const FLUSH_INTERVAL_MS = 500;

const VIEW_TAG = 7;
const FROZEN_VIEW_TAG = 8;

function createComponent() {
  const syncStylePropsBackToReact = jest.fn();
  const component = {
    _syncStylePropsBackToReact: syncStylePropsBackToReact,
  } as unknown as IAnimatedComponentInternal;
  return { component, syncStylePropsBackToReact };
}

describe('PropsRegistryGarbageCollector.syncPropsBackToReact', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getSettledUpdates.mockReset();
    getSettledUpdates.mockReturnValue([]);
    hasPendingSettledUpdates.mockReset();
    hasPendingSettledUpdates.mockReturnValue(false);
  });

  afterEach(() => {
    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);
    PropsRegistryGarbageCollector.unregisterView(FROZEN_VIEW_TAG);
    jest.useRealTimers();
  });

  test('tells native which views are registered', () => {
    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      createComponent().component
    );
    PropsRegistryGarbageCollector.registerView(
      FROZEN_VIEW_TAG,
      createComponent().component
    );
    PropsRegistryGarbageCollector.unregisterView(FROZEN_VIEW_TAG);

    PropsRegistryGarbageCollector.syncPropsBackToReact();

    const [isViewRegistered] = getSettledUpdates.mock.calls[0] as [
      (viewTag: number) => boolean,
    ];
    expect(isViewRegistered(VIEW_TAG)).toBe(true);
    expect(isViewRegistered(FROZEN_VIEW_TAG)).toBe(false);
  });

  test('delivers a settled update to the registered view', () => {
    const { component, syncStylePropsBackToReact } = createComponent();
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);
    getSettledUpdates.mockReturnValue([
      {
        viewTag: VIEW_TAG,
        props: { scrollEnabled: false },
        style: { opacity: 0 },
        keysLastWrittenByAnimatedStyle: ['opacity'],
      },
    ]);

    PropsRegistryGarbageCollector.syncPropsBackToReact();

    expect(syncStylePropsBackToReact).toHaveBeenCalledWith(
      { scrollEnabled: false },
      { opacity: 0 }
    );
  });
});

describe('PropsRegistryGarbageCollector sync interval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getSettledUpdates.mockReset();
    getSettledUpdates.mockReturnValue([]);
    hasPendingSettledUpdates.mockReset();
    hasPendingSettledUpdates.mockReturnValue(false);
  });

  afterEach(() => {
    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);
    PropsRegistryGarbageCollector.unregisterView(FROZEN_VIEW_TAG);
    PropsRegistryGarbageCollector.unregisterInterval();
    jest.useRealTimers();
  });

  test('does not start without a registered view', () => {
    PropsRegistryGarbageCollector.startSync();

    expect(PropsRegistryGarbageCollector.intervalId).toBeNull();
    jest.advanceTimersByTime(FLUSH_INTERVAL_MS);
    expect(getSettledUpdates).not.toHaveBeenCalled();
  });

  test('starts when a view registers', () => {
    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      createComponent().component
    );

    expect(PropsRegistryGarbageCollector.intervalId).not.toBeNull();
    jest.advanceTimersByTime(FLUSH_INTERVAL_MS);
    expect(getSettledUpdates).toHaveBeenCalledTimes(1);
  });

  test('stops after a sync that leaves nothing pending', () => {
    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      createComponent().component
    );

    jest.advanceTimersByTime(FLUSH_INTERVAL_MS);

    expect(PropsRegistryGarbageCollector.intervalId).toBeNull();
    jest.advanceTimersByTime(FLUSH_INTERVAL_MS * 4);
    expect(getSettledUpdates).toHaveBeenCalledTimes(1);
  });

  test('keeps running while native reports pending updates', () => {
    hasPendingSettledUpdates.mockReturnValue(true);
    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      createComponent().component
    );

    jest.advanceTimersByTime(FLUSH_INTERVAL_MS * 3);

    expect(PropsRegistryGarbageCollector.intervalId).not.toBeNull();
    expect(getSettledUpdates).toHaveBeenCalledTimes(3);

    hasPendingSettledUpdates.mockReturnValue(false);
    jest.advanceTimersByTime(FLUSH_INTERVAL_MS);

    expect(PropsRegistryGarbageCollector.intervalId).toBeNull();
  });

  test('asks native about registered views only', () => {
    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      createComponent().component
    );
    PropsRegistryGarbageCollector.registerView(
      FROZEN_VIEW_TAG,
      createComponent().component
    );
    PropsRegistryGarbageCollector.unregisterView(FROZEN_VIEW_TAG);

    jest.advanceTimersByTime(FLUSH_INTERVAL_MS);

    const [isViewRegistered] = hasPendingSettledUpdates.mock.calls[0] as [
      (viewTag: number) => boolean,
    ];
    expect(isViewRegistered(VIEW_TAG)).toBe(true);
    expect(isViewRegistered(FROZEN_VIEW_TAG)).toBe(false);
  });

  test('restarts when a view registers after the sync stopped', () => {
    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      createComponent().component
    );
    jest.advanceTimersByTime(FLUSH_INTERVAL_MS);
    expect(PropsRegistryGarbageCollector.intervalId).toBeNull();

    PropsRegistryGarbageCollector.registerView(
      FROZEN_VIEW_TAG,
      createComponent().component
    );

    expect(PropsRegistryGarbageCollector.intervalId).not.toBeNull();
  });

  test('stops when the last view unregisters', () => {
    hasPendingSettledUpdates.mockReturnValue(true);
    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      createComponent().component
    );

    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);

    expect(PropsRegistryGarbageCollector.intervalId).toBeNull();
    jest.advanceTimersByTime(FLUSH_INTERVAL_MS * 2);
    expect(getSettledUpdates).not.toHaveBeenCalled();
  });

  test('a start requested after the last view unregistered does nothing', () => {
    PropsRegistryGarbageCollector.registerView(
      VIEW_TAG,
      createComponent().component
    );
    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);

    PropsRegistryGarbageCollector.startSync();

    expect(PropsRegistryGarbageCollector.intervalId).toBeNull();
  });
});
