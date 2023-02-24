import { PluginItem, NodePath, PluginPass } from '@babel/core';
import { globals } from './commonObjects';
import {
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from '@babel/types';
import { processWorklets } from './processWorklets';
import { processIfWorkletNode } from './processIfWorkletNode';
import { processIfGestureHandlerEventCallbackFunctionNode } from './processIfGestureHandlerEventCallbackFunctionNode';

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
        enter(path: NodePath<CallExpression>, state: PluginPass) {
          processWorklets(path, state);
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        enter(
          path: NodePath<
            FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
          >,
          state: PluginPass
        ) {
          processIfWorkletNode(path, state);
          processIfGestureHandlerEventCallbackFunctionNode(path, state);
        },
      },
    },
  };
};
