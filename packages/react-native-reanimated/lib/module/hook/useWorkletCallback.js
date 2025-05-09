'use strict';

import { useCallback } from 'react';
/** @deprecated Use React.useCallback instead */
export function useWorkletCallback(worklet, deps) {
  return useCallback(worklet, deps ?? []);
}
//# sourceMappingURL=useWorkletCallback.js.map