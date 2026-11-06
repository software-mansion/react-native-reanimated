'use strict';
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
  });

  afterEach(() => {
    PropsRegistryGarbageCollector.unregisterView(VIEW_TAG);
    PropsRegistryGarbageCollector.unregisterView(FROZEN_VIEW_TAG);
    jest.useRealTimers();
  });

  test('asks native only for the views that are registered', () => {
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

    expect(getSettledUpdates).toHaveBeenCalledWith([VIEW_TAG]);
  });

  test('delivers a settled update to the registered view', () => {
    const { component, syncStylePropsBackToReact } = createComponent();
    PropsRegistryGarbageCollector.registerView(VIEW_TAG, component);
    getSettledUpdates.mockReturnValue([
      { viewTag: VIEW_TAG, styleProps: { opacity: 0 } },
    ]);

    PropsRegistryGarbageCollector.syncPropsBackToReact();

    expect(syncStylePropsBackToReact).toHaveBeenCalledWith({ opacity: 0 });
  });
});
