import { PluginItem, NodePath } from '@babel/core';
import { globals } from './commonObjects';
import {
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  DirectiveLiteral,
} from '@babel/types';
import { ReanimatedPluginPass } from './types';
import { processWorklets } from './processWorklets';
import { processIfWorkletNode } from './processIfWorkletNode';
import { processIfGestureHandlerEventCallbackFunctionNode } from './processIfGestureHandlerEventCallbackFunctionNode';
import { processInlineStylesWarning } from './processInlineStylesWarning';
import { injectVersion } from './injectVersion';

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
      DirectiveLiteral: {
        enter(path: NodePath<DirectiveLiteral>) {
          injectVersion(path);
        },
      },
      CallExpression: {
        enter(path: NodePath<CallExpression>, state: ReanimatedPluginPass) {
          processWorklets(path, state);
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
