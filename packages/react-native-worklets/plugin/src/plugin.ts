import type { NodePath, PluginItem } from '@babel/core';
import type {
  CallExpression,
  ClassDeclaration,
  JSXAttribute,
  ObjectExpression,
  Program,
} from '@babel/types';

import {
  processCalleesAutoworkletizableCallbacks,
  processIfAutoworkletizableCallback,
} from './autoworkletization';
import { processIfWorkletClass } from './class';
import { processIfWorkletContextObject } from './contextObject';
import { processIfWorkletFile } from './file';
import { initializeState } from './globals';
import { processInlineStylesWarning } from './inlineStylesWarning';
import type { ReanimatedPluginPass } from './types';
import { generatedWorkletsDir, WorkletizableFunction } from './types';
import { substituteWebCallExpression } from './webOptimization';
import { processIfWithWorkletDirective } from './workletSubstitution';

module.exports = function WorkletsBabelPlugin(): PluginItem {
  function runWithTaggedExceptions(fun: () => void) {
    try {
      fun();
    } catch (e) {
      throw new Error(`[Worklets] Babel plugin exception: ${e as string}`);
    }
  }

  function isGeneratedWorkletFile(filename: string | undefined): boolean {
    return filename?.includes(generatedWorkletsDir) ?? false;
  }

  return {
    name: 'worklets',

    pre(this: ReanimatedPluginPass) {
      runWithTaggedExceptions(() => {
        initializeState(this);
      });
    },
    visitor: {
      CallExpression: {
        enter(path: NodePath<CallExpression>, state: ReanimatedPluginPass) {
          if (isGeneratedWorkletFile(state.filename)) {
            path.skip();
            return;
          }
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
          state: ReanimatedPluginPass
        ) {
          if (isGeneratedWorkletFile(state.filename)) {
            path.skip();
            return;
          }
          runWithTaggedExceptions(() => {
            processIfWithWorkletDirective(path, state) ||
              processIfAutoworkletizableCallback(path, state);
          });
        },
      },
      ObjectExpression: {
        enter(path: NodePath<ObjectExpression>, state: ReanimatedPluginPass) {
          if (isGeneratedWorkletFile(state.filename)) {
            path.skip();
            return;
          }
          runWithTaggedExceptions(() => {
            processIfWorkletContextObject(path, state);
          });
        },
      },
      ClassDeclaration: {
        enter(path: NodePath<ClassDeclaration>, state: ReanimatedPluginPass) {
          if (isGeneratedWorkletFile(state.filename)) {
            path.skip();
            return;
          }
          runWithTaggedExceptions(() => {
            processIfWorkletClass(path, state);
          });
        },
      },
      Program: {
        enter(path: NodePath<Program>, state: ReanimatedPluginPass) {
          if (isGeneratedWorkletFile(state.filename)) {
            path.skip();
            return;
          }
          runWithTaggedExceptions(() => {
            processIfWorkletFile(path, state);
          });
        },
      },
      JSXAttribute: {
        enter(path: NodePath<JSXAttribute>, state: ReanimatedPluginPass) {
          if (isGeneratedWorkletFile(state.filename)) {
            path.skip();
            return;
          }
          runWithTaggedExceptions(() =>
            processInlineStylesWarning(path, state)
          );
        },
      },
    },
  };
};
