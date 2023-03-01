import { useRef } from 'react';
import { makeMutable } from './core';
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
  const sharableViewDescriptors = makeMutable<Descriptor[]>([]);
  const data: ViewDescriptorsSet = {
    sharableViewDescriptors,
    add: (item: Descriptor) => {
      sharableViewDescriptors.modify((descriptors: Descriptor[]) => {
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
      });
    },

    remove: (viewTag: number) => {
      sharableViewDescriptors.modify((descriptors: Descriptor[]) => {
        'worklet';
        const index = descriptors.findIndex(
          (descriptor) => descriptor.tag === viewTag
        );
        if (index !== -1) {
          descriptors.splice(index, 1);
        }
        return descriptors;
      });
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
