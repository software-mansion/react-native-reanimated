import type { PluginItem, NodePath } from '@babel/core';
import { globals } from './commonObjects';
import type { CallExpression } from '@babel/types';
import { processForCalleesWorklets } from './processForCalleesWorklets';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';
import { processIfWorkletNode } from './processIfWorkletNode';
import { processInlineStylesWarning } from './processInlineStylesWarning';
import { processIfCallback } from './processIfCallback';
import { isRelease } from './utils';

module.exports = function (): PluginItem {
  function callGuardDEV(fun: () => void) {
    try {
      fun();
    } catch (e) {
      throw new Error('[Reanimated] Babel plugin exception: ' + e);
    }
  }

  function releaseCaller(fun: () => void) {
    fun();
  }

  const maybeUseCallGuardDEV = isRelease() ? releaseCaller : callGuardDEV;

  return {
    pre() {
      maybeUseCallGuardDEV(() => {
        // allows adding custom globals such as host-functions
        if (this.opts != null && Array.isArray(this.opts.globals)) {
          this.opts.globals.forEach((name: string) => {
            globals.add(name);
          });
        }
      });
    },
    visitor: {
      CallExpression: {
        enter(path: NodePath<CallExpression>, state: ReanimatedPluginPass) {
          maybeUseCallGuardDEV(() => processForCalleesWorklets(path, state));
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        enter(path: NodePath<ExplicitWorklet>, state: ReanimatedPluginPass) {
          maybeUseCallGuardDEV(() => {
            processIfWorkletNode(path, state);
            processIfCallback(path, state);
          });
        },
      },
      JSXAttribute: {
        enter(path, state) {
          maybeUseCallGuardDEV(() => processInlineStylesWarning(path, state));
        },
      },
    },
  };
};
