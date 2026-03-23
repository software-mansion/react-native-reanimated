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
  processCalleesAutoworkletizableCallbacks,
  processIfAutoworkletizableCallback,
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

  return {
    name: 'worklets',

    pre(this: WorkletsPluginPass) {
      runWithTaggedExceptions(() => {
        initializeState(this);
      });
    },
    visitor: {
      CallExpression: {
        enter(path: NodePath<CallExpression>, state: WorkletsPluginPass) {
          runWithTaggedExceptions(() => {
            processCalleesAutoworkletizableCallbacks(path, state);
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
          runWithTaggedExceptions(
            () =>
              processIfWithWorkletDirective(path, state) ||
              processIfAutoworkletizableCallback(path, state)
          );
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
