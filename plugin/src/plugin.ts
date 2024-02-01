import type { PluginItem, NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import { processCalleesAutoworkletizableCallbacks } from './processForCalleesWorklets';
import { WorkletizableFunction } from './types';
import type { ReanimatedPluginPass } from './types';
import { processIfWithWorkletDirective } from './processIfWorkletNode';
import { processInlineStylesWarning } from './processInlineStylesWarning';
import { processIfAutoworkletizableCallback } from './processIfCallback';
import { addCustomGlobals } from './addCustomGlobals';
import { initializeGlobals } from './globals';
import { substituteWebCallExpression } from './substituteWebCallExpression';

module.exports = function (): PluginItem {
  function runWithTaggedExceptions(fun: () => void) {
    try {
      fun();
    } catch (e) {
      throw new Error('[Reanimated] Babel plugin exception: ' + e);
    }
  }

  return {
    pre() {
      runWithTaggedExceptions(() => {
        initializeGlobals();
        addCustomGlobals.call(this);
      });
    },
    visitor: {
      CallExpression: {
        enter(path: NodePath<CallExpression>, state: ReanimatedPluginPass) {
          runWithTaggedExceptions(() => {
            processCalleesAutoworkletizableCallbacks(path, state);
            if (state.opts.substituteWebPlatformChecks) {
              substituteWebCallExpression(path);
            }
          });
        },
      },
      [WorkletizableFunction]: {
        enter(
          path: NodePath<WorkletizableFunction>,
          state: ReanimatedPluginPass
        ) {
          runWithTaggedExceptions(() => {
            processIfWithWorkletDirective(path, state) ||
              processIfAutoworkletizableCallback(path, state);
          });
        },
      },
      JSXAttribute: {
        enter(path, state) {
          runWithTaggedExceptions(() =>
            processInlineStylesWarning(path, state)
          );
        },
      },
    },
  };
};
