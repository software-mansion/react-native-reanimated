import type { NodePath } from '@babel/core';
import { traverse } from '@babel/core';
import type { File as BabelFile, Identifier } from '@babel/types';
import {
  cloneNode,
  identifier,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
} from '@babel/types';

import { globals } from './globals';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';

export function getClosureEXPERIMENTAL(
  funPath: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): Identifier[] {
  const closureVariables = new Set<string>();
  funPath.traverse(
    {
      ReferencedIdentifier(idPath) {
        if (idPath.isJSXIdentifier()) {
          return;
        }
        if (idPath.key !== null && TypeScriptKeys.has(idPath.key)) {
          // Ignore TypeScript context identifiers.
          return;
        }

        const name = idPath.node.name;

        if (closureVariables.has(name)) {
          return;
        }

        if (globals.has(name)) {
          return;
        }

        if ('id' in funPath.node) {
          // We must handle recursion and
          // not capture the function itself.
          const id = idPath.scope.getBindingIdentifier(name);
          if (id && id === funPath.node.id) {
            return;
          }
        }

        let scope = idPath.scope;
        while (scope !== funPath.scope.parent) {
          if (scope.hasOwnBinding(name)) {
            return;
          }
          scope = scope.parent;
        }

        while (scope) {
          if (scope.hasOwnBinding(name)) {
            closureVariables.add(name);
            return;
          }
          scope = scope.parent;
        }
      },
    },
    state
  );

  return Array.from(closureVariables).map((name) => identifier(name));
}

const TypeScriptKeys = new Set<string | number>([
  'exprName',
  'id',
  'parameterName',
  'typeName',
]);

export function makeArrayFromCapturedBindings(
  ast: BabelFile,
  fun: NodePath<WorkletizableFunction>
): Identifier[] {
  const closure = new Map<string, Identifier>();
  const isLocationAssignedMap = new Map<string, boolean>();

  // this traversal looks for variables to capture
  traverse(ast, {
    Identifier(path) {
      // we only capture variables that were declared outside of the scope
      if (!path.isReferencedIdentifier()) {
        return;
      }
      const name = path.node.name;
      // if the function is named and was added to globals we don't want to add it to closure
      // hence we check if identifier has that name
      if (globals.has(name)) {
        return;
      }
      if (
        'id' in fun.node &&
        fun.node.id &&
        fun.node.id.name === name // we don't want to capture function's own name
      ) {
        return;
      }

      const parentNode = path.parent;

      if (
        isMemberExpression(parentNode) &&
        parentNode.property === path.node &&
        !parentNode.computed
      ) {
        return;
      }

      if (
        isObjectProperty(parentNode) &&
        isObjectExpression(path.parentPath.parent) &&
        path.node !== parentNode.value
      ) {
        return;
      }

      let currentScope = path.scope;

      while (currentScope != null) {
        if (currentScope.bindings[name] != null) {
          return;
        }
        currentScope = currentScope.parent;
      }
      closure.set(name, cloneNode(path.node, true));
      isLocationAssignedMap.set(name, false);
    },
  });

  /*
  For reasons I don't exactly understand, the above traversal will cause the whole 
  bundle to crash if we traversed original node instead of generated
  AST. This is why we need to traverse it again, but this time we set
  location for each identifier that was captured to their original counterpart, since
  AST has its location set relative as if it was a separate file.
  */
  fun.traverse({
    Identifier(path) {
      // So it won't refer to something like:
      // const obj = {unexistingVariable: 1};
      if (!path.isReferencedIdentifier()) {
        return;
      }
      const node = closure.get(path.node.name);
      if (!node || isLocationAssignedMap.get(path.node.name)) {
        return;
      }
      node.loc = path.node.loc;
      isLocationAssignedMap.set(path.node.name, true);
    },
  });

  return Array.from(closure.values());
}
