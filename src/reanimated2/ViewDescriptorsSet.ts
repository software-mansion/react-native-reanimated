import { useRef } from 'react';
import { makeMutable, runOnUI } from './core';
import { SharedValue } from './commonTypes';
import { Descriptor } from './hook/commonTypes';

export interface ViewRefSet<T> {
  items: Set<T>;
  add: (item: T) => void;
  remove: (item: T) => void;
}

export interface ViewDescriptorsSet {
  sharableViewDescriptors: SharedValue<Descriptor[]>;
  add: (item: Descriptor) => void;
  remove: (viewTag: number) => void;
}

export function makeViewDescriptorsSet(): ViewDescriptorsSet {
  const sharableViewDescriptors = makeMutable([]);
  const data: ViewDescriptorsSet = {
    sharableViewDescriptors,
    add: (item: Descriptor) => {
      runOnUI(() => {
        'worklet';
        sharableViewDescriptors.value.push(item);
        sharableViewDescriptors.value = sharableViewDescriptors.value; // trigger listeners
      })();
    },

    remove: (viewTag: number) => {
      runOnUI(() => {
        'worklet';
        const index = sharableViewDescriptors.value.findIndex(
          (descriptor) => descriptor.tag === viewTag
        );
        if (index >= 0) {
          sharableViewDescriptors.value.splice(index, 1);
          sharableViewDescriptors.value = sharableViewDescriptors.value; // trigger listeners
        }
      })();
    },
  };
  return data;
}

export function makeViewsRefSet<T>(): ViewRefSet<T> {
  const ref = useRef<ViewRefSet<T> | null>(null);
  if (ref.current === null) {
    const data: ViewRefSet<T> = {
      items: new Set(),

      add: (item: T) => {
        if (data.items.has(item)) return;
        data.items.add(item);
      },

      remove: (item: T) => {
        data.items.delete(item);
      },
    };
    ref.current = data;
  }

  return ref.current;
}
