'use strict';
import type { SharedValue, StyleUpdaterContainer } from './commonTypes';
import { makeMutable } from './core';
import type { Descriptor, ViewTag } from './hook/commonTypes';

export type ShareableViewDescriptors = SharedValue<
  ReadonlyMap<ViewTag, Descriptor>
> & {
  toArray: () => Descriptor[];
};

export interface ViewDescriptorsMap {
  shareableViewDescriptors: ShareableViewDescriptors;

  /**
   * Adds a new view descriptor to the set
   *
   * @param item - The descriptor to add
   * @param updaterContainer - Optional container with style updater function
   */
  add: (item: Descriptor, updaterContainer?: StyleUpdaterContainer) => void;

  /**
   * Removes a view descriptor from the set by its tag
   *
   * @param viewTag - The tag of the view descriptor to remove
   */
  remove: (viewTag: ViewTag) => void;

  /**
   * Checks if a view descriptor exists in the set
   *
   * @param viewTag - The tag to check for
   * @returns True if the descriptor exists, false otherwise
   */
  has: (viewTag: ViewTag) => boolean;
}

export function makeViewDescriptorsMap(): ViewDescriptorsMap {
  const sharedDescriptors = makeMutable<Map<ViewTag, Descriptor>>(new Map());
  const cachedArray = makeMutable<Descriptor[] | null>(null);
  const viewTags = new Set<ViewTag>();

  return {
    shareableViewDescriptors: {
      ...(sharedDescriptors as SharedValue<ReadonlyMap<ViewTag, Descriptor>>),
      toArray: () => {
        'worklet';
        if (!cachedArray.value) {
          cachedArray.value = Array.from(sharedDescriptors.value.values());
        }
        return cachedArray.value;
      },
    },

    add: (item: Descriptor, updaterContainer?: StyleUpdaterContainer) => {
      viewTags.add(item.tag);
      const updater = updaterContainer?.current;
      sharedDescriptors.modify((descriptors) => {
        'worklet';
        descriptors.set(item.tag, item);
        cachedArray.value = null;
        updater?.(true);
        return descriptors;
      }, false);
    },

    remove: (viewTag: ViewTag) => {
      viewTags.delete(viewTag);
      sharedDescriptors.modify((descriptors) => {
        'worklet';
        descriptors.delete(viewTag);
        cachedArray.value = null;
        return descriptors;
      }, false);
    },

    has: (viewTag: ViewTag) => viewTags.has(viewTag),
  };
}
