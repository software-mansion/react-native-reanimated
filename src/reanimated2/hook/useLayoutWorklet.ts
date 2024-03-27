'use strict';

import type { WorkletFunction } from '../commonTypes';
import { useEvent } from './useEvent';

interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

// @ts-expect-error This overload is required by our API.
export function useLayoutWorklet(worklet: (layout: Layout) => void);

export function useLayoutWorklet(worklet: WorkletFunction) {
  return useEvent(
    (event: { layout: Layout }) => {
      'worklet';
      worklet(event.layout);
    },
    ['topLayout'],
    true
  );
}
