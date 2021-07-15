// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useRef } from 'react';
import { makeMutable } from './core';

export function makeViewDescriptorsSet() {
  const ref = useRef(null);
  if (ref.current === null) {
    const data = {
      batchToRemove: new Set(),
      tags: new Set(),
      waitForInsertSync: false,
      waitForRemoveSync: false,
      workletViewDescriptors: makeMutable([]),
      items: [],

      add: (item) => {
        if (data.tags.has(item.tag)) {
          return;
        }
        data.tags.add(item.tag);
        data.items.push(item);

        if (!data.waitForInsertSync) {
          data.waitForInsertSync = true;

          setImmediate(() => {
            data.workletViewDescriptors.value = data.items;
            data.waitForInsertSync = false;
          });
        }
      },

      remove: (viewTag) => {
        data.batchToRemove.add(viewTag);

        if (!data.waitForRemoveSync) {
          data.waitForRemoveSync = true;

          setImmediate(() => {
            const items = [];
            for (const item of data.items) {
              if (data.batchToRemove.has(item.tag)) {
                data.tags.delete(item.tag);
              } else {
                items.push(item);
              }
            }
            data.items = items;
            data.workletViewDescriptors.value = items;
            data.batchToRemove = new Set();
            data.waitForRemoveSync = false;
          });
        }
      },

      rebuildWorkletViewDescriptors: (workletViewDescriptors) => {
        data.workletViewDescriptors = workletViewDescriptors;
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
