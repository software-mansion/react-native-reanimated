import type { PluginItem, NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import { processForCalleesWorklets } from './processForCalleesWorklets';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';
import { processIfWorkletNode } from './processIfWorkletNode';
import { processInlineStylesWarning } from './processInlineStylesWarning';
import { processIfCallback } from './processIfCallback';
import { addCustomGlobals } from './addCustomGlobals';
import { initializeGlobals } from './globals';

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
          runWithTaggedExceptions(() => processForCalleesWorklets(path, state));
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        enter(path: NodePath<ExplicitWorklet>, state: ReanimatedPluginPass) {
          runWithTaggedExceptions(() => {
            processIfWorkletNode(path, state);
            processIfCallback(path, state);
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
