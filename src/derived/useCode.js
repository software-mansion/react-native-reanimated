import React from 'react';
import { always } from '../base';

function useCode(exec, deps) {
  if (typeof React.useEffect === 'function') {
    React.useEffect(() => {
      if (typeof exec !== 'function') {
        console.warn(
          'useCode() first argument should be a function that returns an animation node.'
        );
      }
      const animatedAlways = always(typeof exec === 'function' ? exec() : exec);
      animatedAlways.__attach();
      return () => {
        animatedAlways.__detach();
      };
    }, deps);
  }
}
export default useCode;
