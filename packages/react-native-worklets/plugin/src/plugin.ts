import type { BabelFile, NodePath, PluginItem } from '@babel/core';
import type {
  CallExpression,
  ClassDeclaration,
  JSXAttribute,
  ObjectExpression,
  Program,
} from '@babel/types';
import {
  callExpression,
  expressionStatement,
  identifier,
  importDeclaration,
  importSpecifier,
  memberExpression,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
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

const registerName = '__registerWorkletFactory';
const invokeFactoryName = '__getWorklet';

module.exports = function WorkletsBabelPlugin(): PluginItem {
  function runWithTaggedExceptions(fun: () => void) {
    try {
      fun();
    } catch (e) {
      throw new Error(`[Reanimated] Babel plugin exception: ${e as string}`);
    }
  }

  return {
    name: 'reanimated',

    pre(this: ReanimatedPluginPass, file: BabelFile) {
      runWithTaggedExceptions(() => {
        initializeState(this);
        // file.ast.program.body.unshift(
        //   variableDeclaration('const', [
        //     variableDeclarator(
        //       identifier(registerName),
        //       memberExpression(
        //         callExpression(identifier('require'), [
        //           stringLiteral('react-native-worklets'),
        //         ]),
        //         identifier(registerName)
        //       )
        //     ),
        //   ]),
        //   variableDeclaration('const', [
        //     variableDeclarator(
        //       identifier(invokeFactoryName),
        //       memberExpression(
        //         callExpression(identifier('require'), [
        //           stringLiteral('react-native-worklets'),
        //         ]),
        //         identifier(invokeFactoryName)
        //       )
        //     ),
        //   ])
        // );
        // console.log(this.filename);
        // if (
        //   this.filename?.includes('react-native-reanimated') ||
        //   this.filename?.includes('react-native-worklets') ||
        //   this.filename?.includes('react-native-gesture-handler') ||
        //   this.filename?.includes('common-app')
        // ) {
        //   file.ast.program.body.unshift(
        //     importDeclaration(
        //       [
        //         importSpecifier(
        //           identifier('__registerWorkletFactory'),
        //           identifier('__registerWorkletFactory')
        //         ),
        //         importSpecifier(
        //           identifier('__getWorklet'),
        //           identifier('__getWorklet')
        //         ),
        //       ],
        //       stringLiteral('react-native-worklets')
        //     )
        //   );
        // }
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
            // addWorkletRegistryImports(path);
            // path.traverse(
            //   {
            //     CallExpression: {
            //       enter(
            //         path: NodePath<CallExpression>,
            //         state: ReanimatedPluginPass
            //       ) {
            //         processCalleesAutoworkletizableCallbacks(path, state);
            //         if (state.opts.substituteWebPlatformChecks) {
            //           substituteWebCallExpression(path);
            //         }
            //       },
            //     },
            //     [WorkletizableFunction]: {
            //       // @ts-ignore www
            //       enter(
            //         path: NodePath<WorkletizableFunction>,
            //         state: ReanimatedPluginPass
            //       ) {
            //         processIfWithWorkletDirective(path, state) ||
            //           processIfAutoworkletizableCallback(path, state);
            //       },
            //     },
            //     ObjectExpression: {
            //       enter(
            //         path: NodePath<ObjectExpression>,
            //         state: ReanimatedPluginPass
            //       ) {
            //         processIfWorkletContextObject(path, state);
            //       },
            //     },
            //     ClassDeclaration: {
            //       enter(
            //         path: NodePath<ClassDeclaration>,
            //         state: ReanimatedPluginPass
            //       ) {
            //         processIfWorkletClass(path, state);
            //       },
            //     },
            //   },
            //   state
            // );
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

function addWorkletRegistryImports(path: NodePath<Program>): void {
  const registerName = '__registerWorkletFactory';
  const invokeFactoryName = '__getWorklet';
  const registerNameBinding = path.scope.getBinding(registerName);
  const invokeFactoryNameBinding = path.scope.getBinding(invokeFactoryName);
  if (registerNameBinding && invokeFactoryNameBinding) {
    return;
  }

  // path.node.body.unshift(
  //   importDeclaration(
  //     [
  //       importSpecifier(identifier(registerName), identifier(registerName)),
  //       importSpecifier(
  //         identifier(invokeFactoryName),
  //         identifier(invokeFactoryName)
  //       ),
  //     ],
  //     stringLiteral('react-native-worklets')
  //   )
  //   // expressionStatement(callExpression(identifier(invokeFactoryName), []))
  // );

  path.node.body.unshift(
    variableDeclaration('const', [
      variableDeclarator(
        identifier(registerName),
        memberExpression(
          callExpression(identifier('require'), [
            stringLiteral('react-native-worklets'),
          ]),
          identifier(registerName)
        )
      ),
    ]),
    variableDeclaration('const', [
      variableDeclarator(
        identifier(invokeFactoryName),
        memberExpression(
          callExpression(identifier('require'), [
            stringLiteral('react-native-worklets'),
          ]),
          identifier(invokeFactoryName)
        )
      ),
    ])
  );
}
