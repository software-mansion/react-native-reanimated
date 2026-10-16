import type { NodePath } from '@babel/core';
import type { Binding, Scope } from '@babel/traverse';
import type {
  Identifier,
  ImportDeclaration,
  JSXIdentifier,
} from '@babel/types';
import { cloneNode, identifier, isJSXIdentifier } from '@babel/types';

import { globals } from './globals';
import {
  canForwardModuleImport,
  canForwardRelativeImport,
  isImport,
  isImportRelative,
} from './imports';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';

function toClosureIdentifier(node: Identifier | JSXIdentifier): Identifier {
  return isJSXIdentifier(node) ? identifier(node.name) : cloneNode(node, true);
}

/**
 * Whether a binding belongs to the worklet. It is the binding the reference
 * resolves to, so a parameter's read of a name the body redeclares stays a
 * capture, as it is in the source.
 */
function isDeclaredWithin(scope: Scope, worklet: Scope): boolean {
  for (
    let current: Scope | undefined = scope;
    current;
    current = current.parent
  ) {
    if (current === worklet) {
      return true;
    }
  }
  return false;
}

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
        if (idPath.isJSXIdentifier() && !state.opts.bundleMode) {
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
          closureVariables.push(toClosureIdentifier(idPath.node));
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

        if (isDeclaredWithin(binding.scope, funPath.scope)) {
          return;
        }

        if (state.opts.bundleMode && isImport(binding)) {
          if (
            isImportRelative(binding) &&
            canForwardRelativeImport(
              state.filename,
              state.importForwarding.relativePaths
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
            canForwardModuleImport(source, state.importForwarding.moduleNames)
          ) {
            capturedNames.add(name);
            moduleBindingsToImport.add(binding);
            return;
          }
        }

        capturedNames.add(name);
        closureVariables.push(toClosureIdentifier(idPath.node));
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
