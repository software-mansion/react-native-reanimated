import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import { globals } from './commonObjects';
import { ReanimatedPluginPass } from './types';
import { processWorklets } from './processWorklets';
import { processIfWorkletNode } from './processIfWorkletNode';
import { processIfGestureHandlerEventCallbackFunctionNode } from './processIfGestureHandlerEventCallbackFunctionNode';
import { processInlineStylesWarning } from './processInlineStylesWarning';
import { injectVersion } from './injectVersion';

export default function ({ types: t }: typeof BabelCore): BabelCore.PluginItem {
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
        enter(path: BabelCore.NodePath<BabelTypes.DirectiveLiteral>) {
          injectVersion(path);
        },
      },
      CallExpression: {
        enter(
          path: BabelCore.NodePath<BabelTypes.CallExpression>,
          state: ReanimatedPluginPass
        ) {
          processWorklets(t, path, state);
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        enter(
          path: BabelCore.NodePath<
            | BabelTypes.FunctionDeclaration
            | BabelTypes.FunctionExpression
            | BabelTypes.ArrowFunctionExpression
          >,
          state: ReanimatedPluginPass
        ) {
          processIfWorkletNode(t, path, state);
          processIfGestureHandlerEventCallbackFunctionNode(t, path, state);
        },
      },
      JSXAttribute: {
        enter(path, state) {
          processInlineStylesWarning(t, path, state);
        },
      },
    },
  };
}
