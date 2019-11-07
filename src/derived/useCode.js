import React from 'react';
import {always, block} from '../base';

/**
 * React hook to run a node.
 * @param nodeFactory Function to build the node to run.
 * @param dependencies Array of dependencies. Refresh the node on changes.
 */
export default function useCode(nodeFactory, dependencies) {
  // check hook support first
  if (!(React.useEffect instanceof Function))
    return;

  // --- run ----
  React.useEffect(() => {
        // --- check and correct 1st parameter ---
        if (!(nodeFactory instanceof Function)) {
          console.warn('useCode() first argument should be a function that returns an animation node.');

          // correct parameter
          const node = nodeFactory;
          nodeFactory = () => node;
        }

        // --- get and execute node (if defined) ---
        let node = nodeFactory();
        if (node) {
          // allow factory to return array
          if (node instanceof Array)
            node = block(node);

          const animatedAlways = always(node);
          animatedAlways.__attach();

          // return undo function
          return () => animatedAlways.__detach();
        }
      },
      dependencies
  );
}
