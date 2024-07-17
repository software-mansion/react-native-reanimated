import type { PluginItem, NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import {
  processIfAutoworkletizableCallback,
  processCalleesAutoworkletizableCallbacks,
} from './autoworkletization';
import { WorkletizableFunction } from './types';
import type { ReanimatedPluginPass } from './types';
import { processIfWithWorkletDirective } from './workletSubstitution';
import { processInlineStylesWarning } from './inlineStylesWarning';
import { addCustomGlobals } from './utils';
import { initializeGlobals } from './globals';
import { substituteWebCallExpression } from './webOptimization';

module.exports = function (): PluginItem {
  function runWithTaggedExceptions(fun: () => void) {
    try {
      fun();
    } catch (e) {
      throw new Error(`[Reanimated] Babel plugin exception: ${e as string}`);
    }
  }

  return {
    pre(state: ReanimatedPluginPass) {
      runWithTaggedExceptions(() => {
        // Initialize worklet number.
        state.workletNumber = 1;
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
      Program: {
        enter(_path, state) {
          runWithTaggedExceptions(() => {
            // Reset worklet number.
            state.workletNumber = 1;
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
