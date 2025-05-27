import type { NodePath } from '@babel/core';
import type { Binding } from '@babel/traverse';
import type { Identifier, ImportDeclaration } from '@babel/types';
import { cloneNode } from '@babel/types';

import {
  globals,
  internalBindingsToCaptureFromGlobalScope,
  outsideBindingsToCaptureFromGlobalScope,
} from './globals';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';

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

        const binding = idPath.scope.getBinding(name);
        if (!binding) {
          /**
           * The variable is unbound - it's either a mistake or implicit capture
           * from the global scope. In this case we have to avoid capturing
           * certain identifiers.
           */
          if (globals.has(name)) {
            return;
          }
          capturedNames.add(name);
          closureVariables.push(cloneNode(idPath.node as Identifier, true));
          return;
        }

        if (
          outsideBindingsToCaptureFromGlobalScope.has(name) ||
          (!state.opts.experimentalBundling &&
            internalBindingsToCaptureFromGlobalScope.has(name))
        ) {
          /**
           * In legacy bundling we have to purposefully ignore some bound
           * identifiers since they are supposed to be captured from the global
           * scope.
           */
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

        if (state.opts.experimentalBundling && isImport(binding)) {
          if (
            isImportRelative(binding) &&
            isAllowedForRelativeImports(
              state.filename,
              state.opts.workletizableModules
            )
          ) {
            capturedNames.add(name);
            relativeBindingsToImport.add(binding);
            return;
          }
          const source = (
            binding.path.parentPath as NodePath<ImportDeclaration>
          ).node.source.value;

          if (isWorkletizableModule(source, state.opts.workletizableModules)) {
            capturedNames.add(name);
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

function isAllowedForRelativeImports(
  filename: string | undefined,
  workletizableModules?: string[]
): boolean {
  return (
    !!filename &&
    (filename.includes('react-native-worklets') ||
      !!workletizableModules?.some((module) => filename.includes(module)))
  );
}

function isWorkletizableModule(
  source: string,
  workletizableModules?: string[]
): boolean {
  return (
    source.startsWith('react-native-worklets') ||
    !!workletizableModules?.some((module) => source.startsWith(module))
  );
}
