'use strict';
import { makeMutable } from './core';
import type { SharedValue } from './commonTypes';
import type { Descriptor } from './hook/commonTypes';

export interface ViewDescriptorsSet {
  shareableViewDescriptors: SharedValue<Descriptor[]>;
  add: (item: Descriptor) => void;
  remove: (viewTag: number) => void;
}

export function makeViewDescriptorsSet(): ViewDescriptorsSet {
  const shareableViewDescriptors = makeMutable<Descriptor[]>([]);
  const data: ViewDescriptorsSet = {
    shareableViewDescriptors,
    add: (item: Descriptor) => {
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
        return descriptors;
      }, false);
    },

    remove: (viewTag: number) => {
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
  };
  return data;
}
