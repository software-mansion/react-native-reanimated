import type { PluginItem, NodePath } from '@babel/core';
import { processForCalleesWorklets } from './processForCalleesWorklets';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';
import { processIfWorkletNode } from './processIfWorkletNode';
import { processInlineStylesWarning } from './processInlineStylesWarning';
import { processIfCallback } from './processIfCallback';
import { addCustomGlobals } from './addCustomGlobals';
import { initializeGlobals } from './globals';
import { substituteWebCallExpression } from './substituteWebCallExpression';
import { processIfWorkletFile } from './processIfWorkletFile';

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
        enter(path, state: ReanimatedPluginPass) {
          if (state.opts.onlyAddWorkletDirectives) {
            return;
          }
          runWithTaggedExceptions(() => {
            processForCalleesWorklets(path, state);
            if (state.opts.substituteWebPlatformChecks) {
              substituteWebCallExpression(path);
            }
          });
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        enter(path: NodePath<ExplicitWorklet>, state: ReanimatedPluginPass) {
          if (state.opts.onlyAddWorkletDirectives) {
            return;
          }
          runWithTaggedExceptions(() => {
            processIfWorkletNode(path, state);
            processIfCallback(path, state);
          });
        },
      },
      JSXAttribute: {
        enter(path, state) {
          if (state.opts.disableInlineStylesWarning) {
            return;
          }
          runWithTaggedExceptions(() =>
            processInlineStylesWarning(path, state)
          );
        },
      },
      Program: {
        enter(path) {
          runWithTaggedExceptions(() => {
            processIfWorkletFile(path);
          });
        },
      },
    },
  };
};
