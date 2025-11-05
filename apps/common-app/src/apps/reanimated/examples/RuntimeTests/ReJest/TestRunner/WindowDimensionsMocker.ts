import type {
  LayoutAnimation,
  LayoutAnimationStartFunction,
  LayoutAnimationsValues,
  LayoutAnimationType,
} from 'react-native-reanimated';

import { SyncUIRunner } from '../utils/SyncUIRunner';

export class WindowDimensionsMocker {
  public async unmockWindowDimensions() {
    await new SyncUIRunner().runOnUIBlocking(() => {
      'worklet';
      if (global.originalLayoutAnimationsManager) {
        global.LayoutAnimationsManager = global.originalLayoutAnimationsManager;
      }
    });
  }

  public async mockWindowDimensions() {
    await new SyncUIRunner().runOnUIBlocking(() => {
      'worklet';
      const originalLayoutAnimationsManager = global.LayoutAnimationsManager;

      const startLayoutAnimation: LayoutAnimationStartFunction = (
        tag: number,
        type: LayoutAnimationType,
        _yogaValues: Partial<LayoutAnimationsValues>,
        config: (arg: Partial<LayoutAnimationsValues>) => LayoutAnimation,
      ) => {
        originalLayoutAnimationsManager.start(
          tag,
          type,
          {
            ..._yogaValues,
            windowHeight: 852,
            windowWidth: 393,
          },
          config,
        );
      };

      global.originalLayoutAnimationsManager = originalLayoutAnimationsManager;
      global.LayoutAnimationsManager = {
        start: startLayoutAnimation,
        stop: originalLayoutAnimationsManager.stop,
      };
    });
  }
}
