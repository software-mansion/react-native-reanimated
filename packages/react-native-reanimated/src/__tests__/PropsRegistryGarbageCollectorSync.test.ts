'use strict';
import type { SettledUpdate } from '../commonTypes';
import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
import { PropsRegistryGarbageCollector } from '../PropsRegistryGarbageCollector';
import { ReanimatedModule } from '../ReanimatedModule';

jest.mock('../ReanimatedModule', () => ({
  ReanimatedModule: {
    getSettledUpdates: jest.fn(),
    markSettledUpdateCommitted: jest.fn(),
  },
}));

const getSettledUpdates = ReanimatedModule.getSettledUpdates as jest.Mock;
const markSettledUpdateCommitted =
  ReanimatedModule.markSettledUpdateCommitted as jest.Mock;

const VIEW_TAG = 7;

function createComponent() {
  const syncStylePropsBackToReact = jest.fn();
  const component = {
    _syncStylePropsBackToReact: syncStylePropsBackToReact,
  } as unknown as IAnimatedComponentInternal;
  return { component, syncStylePropsBackToReact };
}

function settledUpdate(revision: number, opacity = 1): SettledUpdate {
  return { viewTag: VIEW_TAG, styleProps: { opacity }, revision };
}

function commitLastSync(syncStylePropsBackToReact: jest.Mock) {
  const onCommitted = syncStylePropsBackToReact.mock.lastCall?.[1] as
    | (() => void)
    | undefined;
  onCommitted?.();
}

describe('PropsRegistryGarbageCollector.syncPropsBackToReact', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getSettledUpdates.mockReset();
    markSettledUpdateCommitted.mockReset();
  });

  afterEach(() => {
    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);
    jest.useRealTimers();
  });

  test('confirms a settled update only after React commits it', () => {
    const { component, syncStylePropsBackToReact } = createComponent();
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);
    getSettledUpdates.mockReturnValue([settledUpdate(1)]);

    PropsRegistryGarbageCollector.syncPropsBackToReact();

    expect(syncStylePropsBackToReact).toHaveBeenCalledTimes(1);
    expect(syncStylePropsBackToReact.mock.lastCall?.[0]).toEqual({
      opacity: 1,
    });
    expect(markSettledUpdateCommitted).not.toHaveBeenCalled();

    commitLastSync(syncStylePropsBackToReact);

    expect(markSettledUpdateCommitted).toHaveBeenCalledWith(VIEW_TAG, 1);
  });

  test('does not confirm an update for a view that is not registered', () => {
    getSettledUpdates.mockReturnValue([settledUpdate(1)]);

    PropsRegistryGarbageCollector.syncPropsBackToReact();

    expect(markSettledUpdateCommitted).not.toHaveBeenCalled();
  });

  test('delivers a re-sent update once the view is registered again', () => {
    const { component, syncStylePropsBackToReact } = createComponent();
    getSettledUpdates.mockReturnValue([settledUpdate(1)]);

    PropsRegistryGarbageCollector.syncPropsBackToReact();
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);
    PropsRegistryGarbageCollector.syncPropsBackToReact();
    commitLastSync(syncStylePropsBackToReact);

    expect(syncStylePropsBackToReact).toHaveBeenCalledTimes(1);
    expect(markSettledUpdateCommitted).toHaveBeenCalledWith(VIEW_TAG, 1);
  });

  test('does not re-render for a re-sent update while its commit is pending', () => {
    const { component, syncStylePropsBackToReact } = createComponent();
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);
    getSettledUpdates.mockReturnValue([settledUpdate(1)]);

    PropsRegistryGarbageCollector.syncPropsBackToReact();
    PropsRegistryGarbageCollector.syncPropsBackToReact();

    expect(syncStylePropsBackToReact).toHaveBeenCalledTimes(1);
  });

  test('re-renders for a newer revision while an older commit is pending', () => {
    const { component, syncStylePropsBackToReact } = createComponent();
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);

    getSettledUpdates.mockReturnValue([settledUpdate(1, 0.5)]);
    PropsRegistryGarbageCollector.syncPropsBackToReact();
    getSettledUpdates.mockReturnValue([settledUpdate(2, 1)]);
    PropsRegistryGarbageCollector.syncPropsBackToReact();

    expect(syncStylePropsBackToReact).toHaveBeenCalledTimes(2);
    expect(syncStylePropsBackToReact.mock.lastCall?.[0]).toEqual({
      opacity: 1,
    });
  });

  test('re-renders after the view was hidden while its commit was pending', () => {
    const { component, syncStylePropsBackToReact } = createComponent();
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);
    getSettledUpdates.mockReturnValue([settledUpdate(1)]);

    PropsRegistryGarbageCollector.syncPropsBackToReact();
    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);
    PropsRegistryGarbageCollector.syncPropsBackToReact();

    expect(syncStylePropsBackToReact).toHaveBeenCalledTimes(2);
  });

  test('confirms an update without style props right away', () => {
    getSettledUpdates.mockReturnValue([
      { viewTag: VIEW_TAG, styleProps: null, revision: 3 },
    ]);

    PropsRegistryGarbageCollector.syncPropsBackToReact();

    expect(markSettledUpdateCommitted).toHaveBeenCalledWith(VIEW_TAG, 3);
  });
});
