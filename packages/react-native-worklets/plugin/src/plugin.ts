import type { NodePath, PluginItem } from '@babel/core';
import type {
  CallExpression,
  ClassDeclaration,
  ClassMethod,
  ExpressionStatement,
  JSXAttribute,
  ObjectExpression,
  Program,
} from '@babel/types';

import {
  addDirectivesToKnownCallback,
  handleWorkletizableCallback,
} from './autoworkletization';
import { toggleBundleMode } from './bundleMode';
import { processIfWorkletClass } from './class';
import { processIfWorkletMethod } from './classMethod';
import { processIfWorkletContextObject } from './contextObject';
import { processIfWorkletFile } from './file';
import { initializeState } from './globals';
import { processInlineStylesWarning } from './inlineStylesWarning';
import type { WorkletsPluginPass } from './types';
import { WorkletizableFunction } from './types';
import { substituteWebCallExpression } from './webOptimization';
import { processIfWithWorkletDirective } from './workletSubstitution';

module.exports = function WorkletsBabelPlugin(): PluginItem {
  function runWithTaggedExceptions(state: WorkletsPluginPass, fun: () => void) {
    if (state.skipFile) {
      return;
    }
    try {
      fun();
    } catch (e) {
      const error = e as Error;
      error.message = `[Worklets] Babel plugin exception: ${error.message}`;
      error.name = 'WorkletsBabelPluginError';
      throw error;
    }
  }

  return {
    name: 'worklets',

    pre(this: WorkletsPluginPass) {
      runWithTaggedExceptions(this, () => {
        initializeState(this);
        /**
         * We run the micro-plugin in the `pre` step of the whole pipeline to
         * add all 'worklet' directives before React Compiler kicks in.
         *
         * As of now React Compiler begins its work on `Program` visitor.
         */
        this.file.path.traverse(getAutoworkletizationMicroPlugin(), this);
      });
    },
    visitor: {
      CallExpression: {
        enter(path: NodePath<CallExpression>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(state, () => {
            if (state.opts.substituteWebPlatformChecks) {
              substituteWebCallExpression(path);
            }
          });
        },
      },
      [WorkletizableFunction]: {
        enter(
          path: NodePath<WorkletizableFunction>,
          state: WorkletsPluginPass
        ) {
          runWithTaggedExceptions(state, () => {
            processIfWithWorkletDirective(path, state);
          });
        },
      },
      ObjectExpression: {
        enter(path: NodePath<ObjectExpression>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(state, () => {
            processIfWorkletContextObject(path, state);
          });
        },
      },
      ClassDeclaration: {
        enter(path: NodePath<ClassDeclaration>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(state, () => {
            if (state.opts.disableWorkletClasses) {
              return;
            }
            processIfWorkletClass(path, state);
          });
        },
      },
      ClassMethod: {
        enter(path: NodePath<ClassMethod>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(state, () => {
            processIfWorkletMethod(path);
          });
        },
      },
      Program: {
        enter(path: NodePath<Program>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(state, () => {
            processIfWorkletFile(path, state);
          });
        },
      },
      ExpressionStatement: {
        enter(path: NodePath<ExpressionStatement>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(state, () => {
            toggleBundleMode(path, state);
          });
        },
      },
      JSXAttribute: {
        enter(path: NodePath<JSXAttribute>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(state, () =>
            processInlineStylesWarning(path, state)
          );
        },
      },
    },
  };
};

export function getAutoworkletizationMicroPlugin() {
  return {
    CallExpression: {
      enter(path: NodePath<CallExpression>, state: WorkletsPluginPass) {
        handleWorkletizableCallback(path, state);
      },
    },
    [WorkletizableFunction]: {
      enter(path: NodePath) {
        addDirectivesToKnownCallback(path as NodePath<WorkletizableFunction>);
      },
    },
  };
}
