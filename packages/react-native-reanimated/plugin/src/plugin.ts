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
import { WorkletizableFunction } from './types';
import { substituteWebCallExpression } from './webOptimization';
import { processIfWithWorkletDirective } from './workletSubstitution';

module.exports = function (): PluginItem {
  function runWithTaggedExceptions(fun: () => void) {
    try {
      fun();
    } catch (e) {
      throw new Error(`[Reanimated] Babel plugin exception: ${e as string}`);
    }
  }

  return {
    name: 'reanimated',

    pre(this: ReanimatedPluginPass) {
      runWithTaggedExceptions(() => {
        initializeState(this);
      });
    },
    visitor: {
      CallExpression: {
        enter(path: NodePath<CallExpression>, state: ReanimatedPluginPass) {
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
          runWithTaggedExceptions(() => {
            processIfWithWorkletDirective(path, state) ||
              processIfAutoworkletizableCallback(path, state);
          });
        },
      },
      ObjectExpression: {
        enter(path: NodePath<ObjectExpression>, state: ReanimatedPluginPass) {
          runWithTaggedExceptions(() => {
            processIfWorkletContextObject(path, state);
          });
        },
      },
      ClassDeclaration: {
        enter(path: NodePath<ClassDeclaration>, state: ReanimatedPluginPass) {
          runWithTaggedExceptions(() => {
            processIfWorkletClass(path, state);
          });
        },
      },
      Program: {
        enter(path: NodePath<Program>, state: ReanimatedPluginPass) {
          runWithTaggedExceptions(() => {
            processIfWorkletFile(path, state);
          });
        },
      },
      JSXAttribute: {
        enter(path: NodePath<JSXAttribute>, state: ReanimatedPluginPass) {
          runWithTaggedExceptions(() =>
            processInlineStylesWarning(path, state)
          );
        },
      },
    },
  };
};
