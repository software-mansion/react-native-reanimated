import { PluginItem, NodePath } from '@babel/core';
import { globals } from './commonObjects';
import { CallExpression } from '@babel/types';
import { processForCalleesWorklets } from './processForCalleesWorklets';
import { ExplicitWorklet, ReanimatedPluginPass } from './types';
import { processIfWorkletNode } from './processIfWorkletNode';
import { processIfGestureHandlerEventCallbackFunctionNode } from './processIfGestureHandlerEventCallbackFunctionNode';
import { processInlineStylesWarning } from './processInlineStylesWarning';

module.exports = function (): PluginItem {
  return {
    pre() {
      // allows adding custom globals such as host-functions
      if (this.opts != null && Array.isArray(this.opts.globals)) {
        this.opts.globals.forEach((name: string) => {
          globals.add(name);
        });
      }
    },
    visitor: {
      CallExpression: {
        enter(path: NodePath<CallExpression>, state: ReanimatedPluginPass) {
          processForCalleesWorklets(path, state);
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        enter(path: NodePath<ExplicitWorklet>, state: ReanimatedPluginPass) {
          processIfWorkletNode(path, state);
          processIfGestureHandlerEventCallbackFunctionNode(path, state);
        },
      },
      JSXAttribute: {
        enter(path, state) {
          processInlineStylesWarning(path, state);
        },
      },
    },
  };
};
