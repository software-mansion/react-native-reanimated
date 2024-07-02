import {
  blockStatement,
  directive,
  directiveLiteral,
  returnStatement,
} from '@babel/types';

import type {
  Expression,
  Program,
  BlockStatement,
  VariableDeclaration,
} from '@babel/types';
import type { NodePath } from '@babel/core';
import type { ReanimatedPluginPass } from './types';

export function processIfWorkletFile(
  path: NodePath<Program>,
  state: ReanimatedPluginPass
) {
  if (
    path.node.directives.some(
      (functionDirective) => functionDirective.value.value === 'worklet'
    )
  ) {
    processWorkletFile(path, state);
    // Remove 'worklet' directive from the file afterwards.
    path.node.directives = path.node.directives.filter(
      (functionDirective) => functionDirective.value.value !== 'worklet'
    );
  }
}

function processWorkletFile(
  path: NodePath<Program>,
  _state: ReanimatedPluginPass
) {
  path.get('body').forEach((bodyPath) => {
    if (bodyPath.isVariableDeclaration()) {
      processVariableDeclaration(bodyPath);
    }
    if (bodyPath.isFunctionDeclaration()) {
      appendWorkletDirective(bodyPath.node.body);
    }
  });
}

function processVariableDeclaration(path: NodePath<VariableDeclaration>) {
  path.get('declarations').forEach((declaration) => {
    const initPath = declaration.get('init');
    if (initPath.isFunctionExpression()) {
      appendWorkletDirective(initPath.node.body);
    } else if (initPath.isArrowFunctionExpression()) {
      const bodyPath = initPath.get('body');

      // In case of arrow function with no body, i.e. () => 1.
      if (!bodyPath.isBlockStatement()) {
        bodyPath.replaceWith(
          blockStatement([returnStatement(bodyPath.node as Expression)])
        );
      }
      appendWorkletDirective(bodyPath.node as BlockStatement);
    } else if (initPath.isObjectExpression()) {
      initPath.node.properties.forEach((property) => {
        if (property.type === 'ObjectMethod') {
          appendWorkletDirective(property.body);
        }
      });
    }
  });
}

function appendWorkletDirective(node: BlockStatement) {
  if (
    !node.directives.some(
      (functionDirective) => functionDirective.value.value === 'worklet'
    )
  ) {
    node.directives.push(directive(directiveLiteral('worklet')));
  }
}
