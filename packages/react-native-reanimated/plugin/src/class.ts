import { transformSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import {
  assignmentExpression,
  blockStatement,
  cloneNode,
  directive,
  directiveLiteral,
  exportDefaultDeclaration,
  exportNamedDeclaration,
  exportSpecifier,
  expressionStatement,
  identifier,
  isClassProperty,
  isIdentifier,
  memberExpression,
  returnStatement,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import type {
  BlockStatement,
  ClassDeclaration,
  Expression,
  FunctionExpression,
  Program,
  File as BabelFile,
  VariableDeclaration,
  Identifier,
  ClassBody,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
} from '@babel/types';
import type { ReanimatedPluginPass } from './types';
import generate from '@babel/generator';
import { WorkletizableFunction } from './types';
import traverse from '@babel/traverse';
import { strict as assert } from 'assert';

const classWorkletMarker = '__workletClass';

export function processIfWorkletClass(
  classPath: NodePath<ClassDeclaration>,
  state: ReanimatedPluginPass
): boolean {
  if (!classPath.node.id) {
    // We don't support unnamed classes yet.
    return false;
  }

  if (!hasWorkletClassMarker(classPath.node.body)) {
    return false;
  }

  const parentPath = classPath.parentPath;
  const className = classPath.node.id.name;

  classPath = splitClassExports(classPath, parentPath, className);

  removeWorkletClassMarker(classPath.node.body);

  processClass(classPath, state);

  classPath.skip();

  return true;
}

function splitClassExports(
  classPath: NodePath<ClassDeclaration>,
  parentPath: NodePath<unknown>,
  className: string
) {
  if (parentPath.isExportDefaultDeclaration()) {
    return splitDefaultExportClassDeclaration(parentPath, className);
  } else if (parentPath.isExportNamedDeclaration()) {
    return splitNamedExportClassDeclaration(parentPath, className);
  } else {
    return classPath;
  }
}

function splitDefaultExportClassDeclaration(
  exportPath: NodePath<ExportDefaultDeclaration>,
  name: string
): NodePath<ClassDeclaration> {
  const identifierExport = exportDefaultDeclaration(identifier(name));

  const newClassPath = exportPath.replaceWithMultiple([
    exportPath.node.declaration,
    identifierExport,
  ])[0] as NodePath<ClassDeclaration>;

  return newClassPath;
}

function splitNamedExportClassDeclaration(
  exportPath: NodePath<ExportNamedDeclaration>,
  name: string
) {
  const identifierExport = exportNamedDeclaration(null, [
    exportSpecifier(identifier(name), identifier(name)),
  ]);

  const newClassPath = exportPath.replaceWithMultiple([
    exportPath.node.declaration!,
    identifierExport,
  ])[0] as NodePath<ClassDeclaration>;

  return newClassPath;
}

function hasWorkletClassMarker(classBody: ClassBody) {
  return classBody.body.some(
    (statement) =>
      isClassProperty(statement) &&
      isIdentifier(statement.key) &&
      statement.key.name === classWorkletMarker
  );
}

function removeWorkletClassMarker(classBody: ClassBody) {
  classBody.body = classBody.body.filter(
    (statement) =>
      !isClassProperty(statement) ||
      !isIdentifier(statement.key) ||
      statement.key.name !== classWorkletMarker
  );
}

function processClass(
  classPath: NodePath<ClassDeclaration>,
  state: ReanimatedPluginPass
) {
  if (!classPath.node.id) {
    // We don't support unnamed classes yet.
    return;
  }
  const className = classPath.node.id.name;
  const code = generate(classPath.node).code;

  const transformedCode = transformSync(code, {
    plugins: [
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-classes',
      '@babel/plugin-transform-unicode-regex',
    ],
    filename: state.file.opts.filename,
    ast: true,
    babelrc: false,
    configFile: false,
  });

  assert(transformedCode);
  assert(transformedCode.ast);

  const ast = transformedCode.ast;

  let factory: VariableDeclaration;

  let hasHandledClass = false;

  traverse(ast, {
    [WorkletizableFunction]: {
      // @ts-expect-error TS has some trouble inferring here.
      enter: (functionPath: NodePath<WorkletizableFunction>) => {
        if (functionPath.parentPath.isObjectProperty()) {
          return;
        }

        const workletDirective = directive(directiveLiteral('worklet'));

        if (functionPath.parentPath.isCallExpression() && !hasHandledClass) {
          const factoryCopy = cloneNode(
            functionPath.node,
            true
          ) as FunctionExpression;
          factoryCopy.id = identifier(className + 'ClassFactory');
          factoryCopy.body.directives.push(workletDirective);
          factory = variableDeclaration('const', [
            variableDeclarator(
              identifier(className + 'ClassFactory'),
              factoryCopy
            ),
          ]);
          hasHandledClass = true;

          return;
        }

        const bodyPath = functionPath.get('body');
        if (!bodyPath.isBlockStatement()) {
          bodyPath.replaceWith(
            blockStatement([returnStatement(bodyPath.node as Expression)])
          );
        }

        (functionPath.node.body as BlockStatement).directives.push(
          workletDirective
        );
      },
    },
  });

  const body = ast.program.body;
  body.push(factory!);

  body.push(
    expressionStatement(
      assignmentExpression(
        '=',
        memberExpression(
          identifier(className),
          identifier(className + 'ClassFactory')
        ),
        identifier(className + 'ClassFactory')
      )
    )
  );

  sortPolyfills(ast);

  const transformedNewCode = transformSync(generate(ast).code, {
    ast: true,
    filename: state.file.opts.filename,
  });

  assert(transformedNewCode);
  assert(transformedNewCode.ast);

  const parent = classPath.parent as Program;

  const index = parent.body.findIndex((node) => node === classPath.node);

  parent.body.splice(index, 1, ...transformedNewCode.ast.program.body);
}

function sortPolyfills(ast: BabelFile) {
  const toSort = getPolyfillsToSort(ast);

  const sorted = topoSort(toSort);

  const toSortIndices = toSort.map((element) => element.index);
  const sortedIndices = sorted.map((element) => element.index);
  const statements = ast.program.body;
  const oldStatements = [...statements];

  for (let i = 0; i < toSort.length; i++) {
    const sourceIndex = sortedIndices[i];
    const targetIndex = toSortIndices[i];
    const source = oldStatements[sourceIndex];
    statements[targetIndex] = source;
  }
}

function getPolyfillsToSort(ast: BabelFile): SortElement[] {
  const polyfills: SortElement[] = [];

  traverse(ast, {
    Program: {
      enter: (functionPath: NodePath<Program>) => {
        const statements = functionPath.get('body');
        statements.forEach((statement, index) => {
          const bindingIdentifiers = statement.getBindingIdentifiers();
          if (!statement.isFunctionDeclaration() || !statement.node.id?.name) {
            return;
          }

          const element: SortElement = {
            name: statement.node.id.name,
            index,
            dependencies: new Set(),
          };
          polyfills.push(element);
          statement.traverse({
            Identifier(path: NodePath<Identifier>) {
              if (
                !path.isReferencedIdentifier() ||
                path.node.name in bindingIdentifiers ||
                statement.scope.hasOwnBinding(path.node.name) ||
                !statement.scope.hasReference(path.node.name)
              ) {
                return;
              }
              element.dependencies.add(path.node.name);
            },
          });
        });
      },
    },
  });

  return polyfills;
}

function topoSort(toSort: SortElement[]): SortElement[] {
  const sorted: SortElement[] = [];
  const stack: Set<string> = new Set();
  for (const element of toSort) {
    recursiveTopoSort(element, toSort, sorted, stack);
  }
  return sorted;
}

function recursiveTopoSort(
  current: SortElement,
  toSort: SortElement[],
  sorted: SortElement[],
  stack: Set<string>
) {
  if (stack.has(current.name)) {
    throw new Error('Cycle detected. This should never happen.');
  }
  if (sorted.find((element) => element.name === current.name)) {
    return;
  }
  stack.add(current.name);
  for (const dependency of current.dependencies) {
    if (!sorted.find((element) => element.name === dependency)) {
      const next = toSort.find((element) => element.name === dependency);
      assert(next);

      recursiveTopoSort(next, toSort, sorted, stack);
    }
  }
  sorted.push(current);
  stack.delete(current.name);
}

type SortElement = {
  name: string;
  index: number;
  dependencies: Set<string>;
};
