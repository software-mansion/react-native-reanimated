import type { NodePath } from '@babel/core';
import type { Binding, Scope } from '@babel/traverse';
import type {
  ForInStatement,
  ForOfStatement,
  Identifier,
  ImportDeclaration,
  JSXIdentifier,
  Node,
} from '@babel/types';
import {
  cloneNode,
  getBindingIdentifiers,
  identifier,
  isJSXIdentifier,
  isVariableDeclaration,
} from '@babel/types';

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
  const assignments = new Array<[NodePath, Node]>();
  let recrawled = false;

  funPath.traverse(
    {
      'TSType|TSTypeAliasDeclaration|TSInterfaceDeclaration'(typePath) {
        typePath.skip();
      },
      AssignmentExpression(path) {
        assignments.push([path, path.node.left]);
      },
      UpdateExpression(path) {
        assignments.push([path, path.node.argument]);
      },
      'ForInStatement|ForOfStatement'(path) {
        const left = (path.node as ForInStatement | ForOfStatement).left;
        if (!isVariableDeclaration(left)) {
          assignments.push([path, left]);
        }
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

  if (!state.opts.bundleMode) {
    assertNoCapturedAssignment(funPath, capturedNames, assignments);
  }

  return {
    closureVariables,
    moduleBindingsToImport,
    relativeBindingsToImport,
  };
}

/**
 * Captured variables are packed as `const [x] = this.__closure`, so assigning
 * to one inside the worklet is a parse error on Hermes.
 */
function assertNoCapturedAssignment(
  funPath: NodePath<WorkletizableFunction>,
  capturedNames: Set<string>,
  assignments: Array<[NodePath, Node]>
): void {
  for (const [path, target] of assignments) {
    for (const name of Object.keys(getBindingIdentifiers(target))) {
      if (!capturedNames.has(name)) {
        continue;
      }
      const binding = path.scope.getBinding(name);
      if (binding && isScopeInside(binding.scope, funPath.scope)) {
        // A local binding shadowing the captured one.
        continue;
      }
      throw path.buildCodeFrameError(capturedAssignmentMessage(name));
    }
  }
}

function isScopeInside(scope: Scope, ancestor: Scope): boolean {
  for (
    let current: Scope | undefined = scope;
    current;
    current = current.parent
  ) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
}

function capturedAssignmentMessage(name: string): string {
  return (
    `A worklet cannot assign to \`${name}\`, because it is captured from the outer scope. ` +
    'Captured variables are read-only inside worklets.'
  );
}
