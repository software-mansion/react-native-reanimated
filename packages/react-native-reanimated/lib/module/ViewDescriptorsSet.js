'use strict';

import { makeMutable } from './core';
export function makeViewDescriptorsSet() {
  const shareableViewDescriptors = makeMutable([]);
  const data = {
    shareableViewDescriptors,
    add: (item, updaterContainer) => {
      const updater = updaterContainer?.current;
      shareableViewDescriptors.modify(descriptors => {
        'worklet';

        const index = descriptors.findIndex(descriptor => descriptor.tag === item.tag);
        if (index !== -1) {
          descriptors[index] = item;
        } else {
          descriptors.push(item);
        }
        updater?.(true);
        return descriptors;
      }, false);
    },
    remove: viewTag => {
      shareableViewDescriptors.modify(descriptors => {
        'worklet';

        const index = descriptors.findIndex(descriptor => descriptor.tag === viewTag);
        if (index !== -1) {
          descriptors.splice(index, 1);
        }
        return descriptors;
      }, false);
    }
  };
  return data;
}
//# sourceMappingURL=ViewDescriptorsSet.js.map