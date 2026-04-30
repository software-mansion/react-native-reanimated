import type { NodePath, PluginItem } from '@babel/core';
import type {
  CallExpression,
  ClassDeclaration,
  ExpressionStatement,
  JSXAttribute,
  ObjectExpression,
  Program,
} from '@babel/types';

import {
  addWorkletDirectivesToCallbacks,
  addWorkletDirectiveToKnownCallback,
} from './autoworkletization';
import { toggleBundleMode } from './bundleMode';
import { processIfWorkletClass } from './class';
import { processIfWorkletContextObject } from './contextObject';
import { processIfWorkletFile } from './file';
import { initializeState } from './globals';
import { processInlineStylesWarning } from './inlineStylesWarning';
import type { WorkletsPluginPass } from './types';
import { WorkletizableFunction } from './types';
import { substituteWebCallExpression } from './webOptimization';
import { processIfWithWorkletDirective } from './workletSubstitution';

module.exports = function WorkletsBabelPlugin(): PluginItem {
  return {
    name: 'worklets',

    pre(this: WorkletsPluginPass) {
      runWithTaggedExceptions(() => {
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
          runWithTaggedExceptions(() => {
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
          runWithTaggedExceptions(() => {
            processIfWithWorkletDirective(path, state);
          });
        },
      },
      ObjectExpression: {
        enter(path: NodePath<ObjectExpression>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(() => {
            processIfWorkletContextObject(path, state);
          });
        },
      },
      ClassDeclaration: {
        enter(path: NodePath<ClassDeclaration>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(() => {
            if (state.opts.disableWorkletClasses) {
              return;
            }
            processIfWorkletClass(path, state);
          });
        },
      },
      Program: {
        enter(path: NodePath<Program>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(() => {
            processIfWorkletFile(path, state);
          });
        },
      },
      ExpressionStatement: {
        enter(path: NodePath<ExpressionStatement>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(() => {
            toggleBundleMode(path, state);
          });
        },
      },
      JSXAttribute: {
        enter(path: NodePath<JSXAttribute>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(() =>
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
        addWorkletDirectivesToCallbacks(path, state);
      },
    },
    [WorkletizableFunction]: {
      enter(path: NodePath) {
        addWorkletDirectiveToKnownCallback(
          path as NodePath<WorkletizableFunction>
        );
      },
    },
  };
}

function runWithTaggedExceptions(fun: () => void) {
  try {
    fun();
  } catch (e) {
    const error = e as Error;
    error.message = `[Worklets] Babel plugin exception: ${error.message}`;
    error.name = 'WorkletsBabelPluginError';
    throw error;
  }
}
