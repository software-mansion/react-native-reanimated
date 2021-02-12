import { useRef } from 'react';
import { makeMutable } from './core';

export function makeViewDescriptorsSet() {
  const ref = useRef(null);
  if (ref.current === null) {
    const data = {
      itemSet: new Set(),
      waitForInsertSync: false,
      waitForRemoveSync: false,
      workletViewDescriptors: makeMutable([]),

      add: (item) => {
        data.itemSet.add(item);

        if (!data.waitForInsertSync) {
          data.waitForInsertSync = true;

          setImmediate(() => {
            data.workletViewDescriptors.value = Array.from(data.itemSet);
            data.waitForInsertSync = false;
          });
        }
      },
      remove: (item) => {
        data.itemSet.delete(item);

        if (!data.waitForRemoveSync) {
          data.waitForRemoveSync = true;

          setImmediate(() => {
            data.workletViewDescriptors.value = Array.from(data.itemSet);
            data.waitForRemoveSync = false;
          });
        }
      },
      rebuildWorkletViewDescriptors: (workletViewDescriptors) => {
        data.workletViewDescriptors = workletViewDescriptors;
        data.workletViewDescriptors.value = Array.from(data.itemSet);
      },
    };
    ref.current = data;
  }

  return ref.current;
}

export function makeViewsRefSet() {
  const ref = useRef(null);
  if (ref.current === null) {
    const data = {
      items: new Set(),

      add: (item) => {
        if (data.items.has(item)) return;
        data.items.add(item);
      },
      remove: (item) => {
        data.items.delete(item);
      },
    };
    ref.current = data;
  }

  return ref.current;
}
