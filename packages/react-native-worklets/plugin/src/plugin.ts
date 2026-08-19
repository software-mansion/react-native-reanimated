import type { NodePath, PluginItem, Visitor } from '@babel/core';
import type { CallExpression, Directive } from '@babel/types';

import {
  addDirectivesToKnownCallback,
  handleWorkletizableCallback,
} from './autoworkletization';
import { handleWorkletDirective } from './directives';
import { initializeState } from './globals';
import type { WorkletsPluginPass } from './types';
import { WorkletizableFunction } from './types';
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
    },
  };
};

export function getAutoworkletizationMicroPlugin(): Visitor<WorkletsPluginPass> {
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
    Directive: {
      enter(path: NodePath) {
        handleWorkletDirective(path as NodePath<Directive>);
      },
    },
  };
}
