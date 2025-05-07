import type { NodePath } from '@babel/core';

import { globals } from './globals';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';

export function getClosure(
  funPath: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): string[] {
  const closureVariables = new Set<string>();
  // console.log(Object.entries(funPath.scope.bindings));
  // console.log(!!funPath.scope.getBinding('bar'));
  // console.log(funPath.get('body').scope.bindings);
  // console.log(funPath.scope.getAllBindings());
  // console.log(funPath.scope.references);
  funPath.traverse(
    {
      // Function(funPath) {
      //   console.log(funPath.scope.bindings);
      // },
      // TypeScript(tsPath) {
      //   tsPath.skip();
      // },
      ReferencedIdentifier(idPath) {
        if (idPath.isJSXIdentifier()) {
          return;
        }
        if (idPath.key === 'typeName') {
          // Ignore TypeScript type references.
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
          // We must handle recursion.
          const id = idPath.scope.getBindingIdentifier(name);
          if (id && id === funPath.node.id) {
            // Don't capture the function itself.
            return;
          }
        }

        if (funPath.scope.hasOwnBinding(idPath.node.name)) {
          return;
        }

        if (idPath.scope.hasOwnBinding(idPath.node.name)) {
          return;
        }

        closureVariables.add(name);
      },
    },
    state
  );

  return Array.from(closureVariables);
}
