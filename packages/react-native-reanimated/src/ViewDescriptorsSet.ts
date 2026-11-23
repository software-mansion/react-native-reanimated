'use strict';
import type { SharedValue, StyleUpdaterContainer } from './commonTypes';
import { makeMutable } from './core';
import type { Descriptor } from './hook/commonTypes';
import { ReanimatedModule } from './ReanimatedModule';

export interface ViewDescriptorsSet {
  shareableViewDescriptors: SharedValue<Descriptor[]>;
  add: (item: Descriptor, updaterContainer?: StyleUpdaterContainer) => void;
  remove: (viewTag: number) => void;
  has: (viewTag: number) => boolean;
}

export function makeViewDescriptorsSet(): ViewDescriptorsSet {
  const shareableViewDescriptors = makeMutable<Descriptor[]>([]);
  const viewTags = new Set<number>();

  const data: ViewDescriptorsSet = {
    shareableViewDescriptors,
    add: (input: Descriptor, updaterContainer?: StyleUpdaterContainer) => {
      viewTags.add(input.tag as number);
      const item: Descriptor = input.shadowNodeWrapper
        ? {
            ...input,
            shadowNodeWrapper: ReanimatedModule.createUIShadowNodeWrapper(
              input.shadowNodeWrapper
            ),
          }
        : input;
      const updater = updaterContainer?.current;
      shareableViewDescriptors.modify((descriptors) => {
        'worklet';
        const index = descriptors.findIndex(
          (descriptor) => descriptor.tag === item.tag
        );
        if (index !== -1) {
          descriptors[index] = item;
        } else {
          descriptors.push(item);
        }
        updater?.(true);
        return descriptors;
      }, false);
    },

    remove: (viewTag: number) => {
      viewTags.delete(viewTag);
      shareableViewDescriptors.modify((descriptors) => {
        'worklet';
        const index = descriptors.findIndex(
          (descriptor) => descriptor.tag === viewTag
        );
        if (index !== -1) {
          descriptors.splice(index, 1);
        }
        return descriptors;
      }, false);
    },

    has: (viewTag: number) => viewTags.has(viewTag),
  };

  return data;
}
