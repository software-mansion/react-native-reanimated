import type { NodePath } from '@babel/core';
import { transformSync } from '@babel/core';
import generate from '@babel/generator';
import traverse from '@babel/traverse';
import type {
  File as BabelFile,
  CallExpression,
  ClassBody,
  ClassDeclaration,
  Identifier,
  Program,
  Statement,
  VariableDeclaration,
} from '@babel/types';
import {
  assignmentExpression,
  blockStatement,
  callExpression,
  directive,
  directiveLiteral,
  expressionStatement,
  functionDeclaration,
  functionExpression,
  identifier,
  isClassProperty,
  isFunctionDeclaration,
  isIdentifier,
  isVariableDeclaration,
  memberExpression,
  returnStatement,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import type { ReanimatedPluginPass } from './types';
import { workletClassFactorySuffix } from './types';
import { replaceWithFactoryCall } from './utils';

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

  removeWorkletClassMarker(classPath.node.body);

  processClass(classPath, state);

  return true;
}

function processClass(
  classPath: NodePath<ClassDeclaration>,
  state: ReanimatedPluginPass
) {
  assert(classPath.node.id);
  const className = classPath.node.id.name;

  const polyfilledClassAst = getPolyfilledAst(classPath.node, state);

  appendWorkletDirectiveToPolyfills(polyfilledClassAst.program.body);

  replaceClassDeclarationWithFactoryAndCall(
    polyfilledClassAst.program.body,
    className
  );

  sortPolyfills(polyfilledClassAst);

  polyfilledClassAst.program.body.push(returnStatement(identifier(className)));

  const factoryFactory = functionExpression(
    null,
    [],
    blockStatement([...polyfilledClassAst.program.body])
  );

  const factoryCall = callExpression(factoryFactory, []);

  replaceWithFactoryCall(classPath, className, factoryCall);
  // const body = classWithPolyfills.ast.program.body;
  // body.push(factory!);

  // body.push(
  //   expressionStatement(
  //     assignmentExpression(
  //       '=',
  //       memberExpression(
  //         identifier(className),
  //         identifier(className + classFactorySuffix)
  //       ),
  //       identifier(className + classFactorySuffix)
  //     )
  //   )
  // );

  // sortPolyfills(classWithPolyfills.ast);

  // const transformedNewCode = transformSync(
  //   generate(classWithPolyfills.ast).code,
  //   {
  //     ast: true,
  //     filename: state.file.opts.filename,
  //   }
  // );

  // assert(transformedNewCode);
  // assert(transformedNewCode.ast);

  // // const needsDeclaration = needsDeclaration(classPath.parent);

  // const parent = classPath.parent as Program;

  // const index = parent.body.findIndex((node) => node === classPath.node);

  // parent.body.splice(index, 1, ...transformedNewCode.ast.program.body);
  // #endregion
}

function getPolyfilledAst(
  classNode: ClassDeclaration,
  state: ReanimatedPluginPass
) {
  const classCode = generate(classNode).code;

  const classWithPolyfills = transformSync(classCode, {
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

  assert(classWithPolyfills && classWithPolyfills.ast);

  return classWithPolyfills.ast;
}

function appendWorkletDirectiveToPolyfills(statements: Statement[]) {
  statements.forEach((statement) => {
    if (isFunctionDeclaration(statement)) {
      const workletDirective = directive(directiveLiteral('worklet'));
      statement.body.directives.push(workletDirective);
    }
  });
}

/**
 * Replaces
 * ```ts
 * const Clazz = ...;
 * ```
 * with
 * ```ts
 * const Clazz__classFactory = ...;
 * const Clazz = Clazz__classFactory();
 * ```
 */
function replaceClassDeclarationWithFactoryAndCall(
  statements: Statement[],
  className: string
) {
  const classFactoryName = className + workletClassFactorySuffix;

  const classDeclarationIndex = getPolyfilledClassDeclarationIndex(
    statements,
    className
  );

  const classDeclarationToReplace = statements[
    classDeclarationIndex
  ] as VariableDeclaration;

  const classDeclarationInit = classDeclarationToReplace.declarations[0]
    .init as CallExpression;

  const classFactoryDeclaration = functionDeclaration(
    identifier(classFactoryName),
    [],
    blockStatement(
      [
        variableDeclaration('const', [
          variableDeclarator(identifier(className), classDeclarationInit),
        ]),
        expressionStatement(
          assignmentExpression(
            '=',
            memberExpression(
              identifier(className),
              identifier(classFactoryName)
            ),
            identifier(classFactoryName)
          )
        ),
        returnStatement(identifier(className)),
      ],
      [directive(directiveLiteral('worklet'))]
    )
  );

  const newClassDeclaration = variableDeclaration('const', [
    variableDeclarator(
      identifier(className),
      callExpression(identifier(classFactoryName), [])
    ),
  ]);

  statements.splice(
    classDeclarationIndex,
    1,
    classFactoryDeclaration,
    newClassDeclaration
  );
}

function getPolyfilledClassDeclarationIndex(
  statements: Statement[],
  className: string
) {
  const index = statements.findIndex(
    (statement) =>
      isVariableDeclaration(statement) &&
      statement.declarations.some(
        (declaration) =>
          isIdentifier(declaration.id) && declaration.id.name === className
      )
  );
  assert(index >= 0);
  return index;
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

function getPolyfillsToSort(ast: BabelFile): Polyfill[] {
  const polyfills: Polyfill[] = [];

  traverse(ast, {
    Program: {
      enter: (functionPath: NodePath<Program>) => {
        const statements = functionPath.get('body');
        statements.forEach((statement, index) => {
          const bindingIdentifiers = statement.getBindingIdentifiers();
          if (!statement.isFunctionDeclaration() || !statement.node.id?.name) {
            return;
          }

          const element: Polyfill = {
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

function topoSort(toSort: Polyfill[]): Polyfill[] {
  const sorted: Polyfill[] = [];
  const stack: Set<string> = new Set();
  for (const element of toSort) {
    recursiveTopoSort(element, toSort, sorted, stack);
  }
  return sorted;
}

function recursiveTopoSort(
  current: Polyfill,
  toSort: Polyfill[],
  sorted: Polyfill[],
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

type Polyfill = {
  name: string;
  index: number;
  dependencies: Set<string>;
};
