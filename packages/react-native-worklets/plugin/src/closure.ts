import type { NodePath } from '@babel/core';
import type { Binding } from '@babel/traverse';
import type { Identifier, ImportDeclaration } from '@babel/types';
import { cloneNode } from '@babel/types';

import { globals } from './globals';
import {
  canForwardModuleImport,
  canForwardRelativeImport,
  isImport,
  isImportRelative,
} from './imports';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';

export function getClosure(
  funPath: NodePath<WorkletizableFunction>,
  state: WorkletsPluginPass
): {
  closureVariables: Identifier[];
  moduleBindingsToImport: Set<Binding>;
  relativeBindingsToImport: Set<Binding>;
} {
  const capturedNames = new Set<string>();
  const closureVariables = new Array<Identifier>();
  const moduleBindingsToImport = new Set<Binding>();
  const relativeBindingsToImport = new Set<Binding>();
  let recrawled = false;

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

        let binding = idPath.scope.getBinding(name);

        if (!binding && !recrawled) {
          /**
           * Some plugins might add new identifiers but not update the scope
           * when they should. To prevent errors stemming from this we recrawl
           * the scope once per closure assembly.
           */
          recrawled = true;
          idPath.scope.crawl();
          binding = idPath.scope.getBinding(name);
        }

        if (!binding) {
          /**
           * The variable is unbound - it's either a mistake or implicit capture
           * from the global scope. In this case we have to avoid capturing
           * certain identifiers.
           */
          if (state.opts.strictGlobal || globals.has(name)) {
            return;
          }
          capturedNames.add(name);
          closureVariables.push(cloneNode(idPath.node as Identifier, true));
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

        if (state.opts.bundleMode && isImport(binding)) {
          if (
            isImportRelative(binding) &&
            canForwardRelativeImport(
              state.filename,
              state.opts.importForwarding.relativePaths
            )
          ) {
            capturedNames.add(name);
            relativeBindingsToImport.add(binding);
            return;
          }
          const source = (
            binding.path.parentPath as NodePath<ImportDeclaration>
          ).node.source.value;

          if (
            canForwardModuleImport(
              source,
              state.opts.importForwarding.moduleNames
            )
          ) {
            capturedNames.add(name);
            moduleBindingsToImport.add(binding);
            return;
          }
        }

        capturedNames.add(name);
        closureVariables.push(cloneNode(idPath.node as Identifier, true));
      },
    },
    state
  );

  return {
    closureVariables,
    moduleBindingsToImport,
    relativeBindingsToImport,
  };
}
