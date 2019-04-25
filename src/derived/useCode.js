import React from 'react';
import { always } from '../base';

function useCode(exec, deps) {
  if (typeof React.useEffect === 'function') {
    React.useEffect(() => {
      const animatedAlways = always(exec);
      animatedAlways.__attach();
      return () => {
        animatedAlways.__detach();
      };
    }, deps);
  }
}
export default useCode;
