import React from 'react';
import { createAnimatedFunction } from '../core/AnimatedFunction';

function useProc(cb, deps) {
  if (typeof React.useEffect === 'function') {
    const proc = React.useState(() => createAnimatedFunction(cb));
    React.useEffect(() => {
      proc.__attach();
      return () => {
        proc.__detach();
      };
    }, deps);
    return proc;
  }
  return undefined;
}

export default useProc;
