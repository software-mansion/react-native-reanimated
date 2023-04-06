import { PluginItem, NodePath } from '@babel/core';
import { globals } from './commonObjects';
import {
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  DirectiveLiteral,
} from '@babel/types';
import { processForCalleesWorklets } from './processForCalleesWorklets';
import { ReanimatedPluginPass } from './types';
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
