'use strict';
import { useRef } from 'react';
import { makeMutable } from './core';
import type { SharedValue } from './commonTypes';
import type { Descriptor } from './hook/commonTypes';
import { shouldBeUseWeb } from './PlatformChecker';

export interface ViewRefSet<T> {
  items: Set<T>;
  add: (item: T) => void;
  remove: (item: T) => void;
}

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

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

export const useViewRefSet = SHOULD_BE_USE_WEB
  ? useViewRefSetJS
  : useViewRefSetNative;

function useViewRefSetNative() {
  // Stub native implementation.
  return undefined;
}

function useViewRefSetJS<T>(): ViewRefSet<T> {
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
