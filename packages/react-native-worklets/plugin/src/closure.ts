import type { NodePath } from '@babel/core';
import type { Identifier } from '@babel/types';
import { cloneNode } from '@babel/types';

import { globals } from './globals';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';

export function getClosure(
  funPath: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): Identifier[] {
  const capturedNames = new Set<string>();
  const closureVariables = new Array<Identifier>();
  funPath.traverse(
    {
      'TSType|TSTypeAliasDeclaration|TSInterfaceDeclaration'(typePath) {
        typePath.skip();
      },
      ReferencedIdentifier(idPath) {
        if (idPath.isJSXIdentifier()) {
          return;
        }

        const name = idPath.node.name;

        if (capturedNames.has(name)) {
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

        capturedNames.add(name);
        closureVariables.push(cloneNode(idPath.node as Identifier, true));
      },
    },
    state
  );

  return closureVariables;
}
