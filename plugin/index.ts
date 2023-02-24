import { PluginItem, NodePath, PluginPass } from '@babel/core';
import { globals } from './src/commonObjects';
import {
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from '@babel/types';
import { processWorklets } from './src/processWorklets';
import { processIfWorkletNode } from './src/processIfWorkletNode';
import { processIfGestureHandlerEventCallbackFunctionNode } from './src/processIfGestureHandlerEventCallbackFunctionNode';

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
