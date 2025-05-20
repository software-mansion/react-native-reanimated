import type { NodePath } from '@babel/core';
import type { Binding } from '@babel/traverse';
import type { Identifier, ImportDeclaration } from '@babel/types';
import { cloneNode } from '@babel/types';

import { globals } from './globals';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { generatedWorkletsDir } from './types';

export function getClosure(
  funPath: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): {
  closureVariables: Identifier[];
  libraryBindingsToImport: Set<Binding>;
  relativeBindingsToImport: Set<Binding>;
} {
  const capturedNames = new Set<string>();
  const closureVariables = new Array<Identifier>();
  const libraryBindingsToImport = new Set<Binding>();
  const relativeBindingsToImport = new Set<Binding>();

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

        const binding = idPath.scope.getBinding(name);
        if (!binding) {
          // Implicitly bound variable from the global scope.
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

        if (
          state.opts.experimentalBundling &&
          state.filename?.includes('react-native-worklets') &&
          !state.filename?.includes(generatedWorkletsDir) &&
          isImport(binding)
        ) {
          if (isImportRelative(binding)) {
            relativeBindingsToImport.add(binding);
            return;
          } else if (
            (binding.path.parentPath!.node as ImportDeclaration).source
              .value === 'react-native-worklets'
          ) {
            libraryBindingsToImport.add(binding);
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
    libraryBindingsToImport,
    relativeBindingsToImport,
  };
}

function isImport(binding: Binding): boolean {
  return (
    binding.kind === 'module' &&
    binding.constant &&
    binding.path.isImportSpecifier() &&
    binding.path.parentPath.isImportDeclaration()
  );
}

function isImportRelative(imported: Binding): boolean {
  return (
    imported.path.parentPath as NodePath<ImportDeclaration>
  ).node.source.value.startsWith('.');
}
