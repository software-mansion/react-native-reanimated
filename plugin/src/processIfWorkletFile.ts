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

export function processIfWorkletFile(path: NodePath<Program>) {
  if (
    path.node.directives.some(
      (functionDirective) => functionDirective.value.value === 'worklet'
    )
  ) {
    processWorkletFile(path);
    path.node.directives = path.node.directives.filter(
      (functionDirective) => functionDirective.value.value !== 'worklet'
    );
  }
}

function processWorkletFile(path: NodePath<Program>) {
  path.get('body').forEach((bodyPath) => {
    if (bodyPath.isVariableDeclaration()) {
      processVariableDeclaration(bodyPath);
    }
  });
  path.traverse({
    FunctionDeclaration(subPath) {
      appendWorkletDirective(subPath.node.body);
    },
  });
}

function processVariableDeclaration(path: NodePath<VariableDeclaration>) {
  path.get('declarations').forEach((declaration) => {
    const initPath = declaration.get('init');
    if (initPath.isFunctionExpression()) {
      appendWorkletDirective(initPath.node.body);
    } else if (initPath.isArrowFunctionExpression()) {
      const bodyPath = initPath.get('body');
      if (bodyPath.isBlockStatement()) {
        appendWorkletDirective(bodyPath.node);
      } else {
        bodyPath.replaceWith(
          blockStatement([returnStatement(bodyPath.node as Expression)])
        );
        appendWorkletDirective(bodyPath.node as BlockStatement);
      }
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
