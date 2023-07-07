import type { PluginItem, NodePath } from '@babel/core';
import { globals } from './commonObjects';
import type {
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from '@babel/types';
import { processForCalleesWorklets } from './processForCalleesWorklets';
import type { ReanimatedPluginPass } from './types';
import { processIfWorkletNode } from './processIfWorkletNode';
import { processInlineStylesWarning } from './processInlineStylesWarning';
import { processIfCallback } from './processIfCallback';

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
        enter(
          path: NodePath<
            FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
          >,
          state: ReanimatedPluginPass
        ) {
          processIfWorkletNode(path, state);
          processIfCallback(path, state);
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
