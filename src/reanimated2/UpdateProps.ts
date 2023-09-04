import type { MutableRefObject } from 'react';
import { processColorsInProps } from './Colors';
import type { ShadowNodeWrapper, SharedValue, StyleProps } from './commonTypes';
import type { AnimatedStyle } from './helperTypes';
import type { Descriptor } from './hook/commonTypes';
import { _updatePropsJS } from './js-reanimated';
import { shouldBeUseWeb } from './PlatformChecker';
import type { ViewRefSet } from './ViewDescriptorsSet';
import { runOnUIImmediately } from './threads';

let updateProps: (
  viewDescriptor: SharedValue<Descriptor[]>,
  updates: StyleProps | AnimatedStyle<any>,
  maybeViewRef: ViewRefSet<any> | undefined,
  isAnimatedProps?: boolean
) => void;

if (shouldBeUseWeb()) {
  updateProps = (_, updates, maybeViewRef, isAnimatedProps) => {
    'worklet';
    if (maybeViewRef) {
      maybeViewRef.items.forEach((item, _) => {
        _updatePropsJS(updates, item, isAnimatedProps);
      });
    }
  };
} else {
  updateProps = (viewDescriptors, updates) => {
    'worklet';
    processColorsInProps(updates);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    global.UpdatePropsManager!.update(viewDescriptors, updates);
  };
}

export const updatePropsJestWrapper = (
  viewDescriptors: SharedValue<Descriptor[]>,
  updates: AnimatedStyle<any>,
  maybeViewRef: ViewRefSet<any> | undefined,
  animatedStyle: MutableRefObject<AnimatedStyle<any>>,
  adapters: ((updates: AnimatedStyle<any>) => void)[]
): void => {
  adapters.forEach((adapter) => {
    adapter(updates);
  });
  animatedStyle.current.value = {
    ...animatedStyle.current.value,
    ...updates,
  };

  updateProps(viewDescriptors, updates, maybeViewRef);
};

export default updateProps;

const createUpdatePropsManager = global._IS_FABRIC
  ? () => {
      'worklet';
      // Fabric
      const operations: {
        shadowNodeWrapper: ShadowNodeWrapper;
        updates: StyleProps | AnimatedStyle<any>;
      }[] = [];
      return {
        update(
          viewDescriptors: SharedValue<Descriptor[]>,
          updates: StyleProps | AnimatedStyle<any>
        ) {
          viewDescriptors.value.forEach((viewDescriptor) => {
            operations.push({
              shadowNodeWrapper: viewDescriptor.shadowNodeWrapper,
              updates,
            });
            if (operations.length === 1) {
              queueMicrotask(this.flush);
            }
          });
        },
        flush() {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          _updatePropsFabric!(operations);
          operations.length = 0;
        },
      };
    }
  : () => {
      'worklet';
      // Paper
      const operations: {
        tag: number;
        name: string;
        updates: StyleProps | AnimatedStyle<any>;
      }[] = [];
      return {
        update(
          viewDescriptors: SharedValue<Descriptor[]>,
          updates: StyleProps | AnimatedStyle<any>
        ) {
          viewDescriptors.value.forEach((viewDescriptor) => {
            operations.push({
              tag: viewDescriptor.tag,
              name: viewDescriptor.name || 'RCTView',
              updates,
            });
            if (operations.length === 1) {
              queueMicrotask(this.flush);
            }
          });
        },
        flush() {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          _updatePropsPaper!(operations);
          operations.length = 0;
        },
      };
    };

runOnUIImmediately(() => {
  'worklet';
  global.UpdatePropsManager = createUpdatePropsManager();
})();

export interface UpdatePropsManager {
  update(
    viewDescriptors: SharedValue<Descriptor[]>,
    updates: StyleProps | AnimatedStyle<any>
  ): void;
  flush(): void;
}
