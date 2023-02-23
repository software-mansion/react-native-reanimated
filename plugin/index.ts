'use strict';

import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import generate from '@babel/generator';
import traverse from '@babel/traverse';
import { transformSync } from '@babel/core';
import * as fs from 'fs';
import * as convertSourceMap from 'convert-source-map';
import {
  functionArgsToWorkletize,
  objectHooks,
  globals,
  gestureHandlerGestureObjects,
  gestureHandlerBuilderMethods,
} from './commonObjects';
import { isRelease, shouldGenerateSourceMap, hash } from './commonFunctions';
import { BabelMapType } from './commonInterfaces';

function buildWorkletString(
  fun: BabelCore.types.File,
  closureVariables: Array<BabelTypes.Identifier>,
  name: string,
  inputMap: BabelMapType | null | undefined
): Array<string | null | undefined> {
  function prependClosureVariablesIfNecessary() {
    const closureDeclaration = BabelTypes.variableDeclaration('const', [
      BabelTypes.variableDeclarator(
        BabelTypes.objectPattern(
          closureVariables.map((variable) =>
            BabelTypes.objectProperty(
              BabelTypes.identifier(variable.name),
              BabelTypes.identifier(variable.name),
              false,
              true
            )
          )
        ),
        BabelTypes.memberExpression(
          BabelTypes.thisExpression(),
          BabelTypes.identifier('_closure')
        )
      ),
    ]);

    function prependClosure(
      path: BabelCore.NodePath<
        | BabelTypes.FunctionDeclaration
        | BabelTypes.FunctionExpression
        | BabelTypes.ArrowFunctionExpression
        | BabelTypes.ObjectMethod
      >
    ) {
      if (closureVariables.length === 0 || path.parent.type !== 'Program') {
        return;
      }

      if (!BabelTypes.isExpression(path.node.body))
        path.node.body.body.unshift(closureDeclaration);
    }

    function prependRecursiveDeclaration(
      path: BabelCore.NodePath<
        | BabelTypes.FunctionDeclaration
        | BabelTypes.FunctionExpression
        | BabelTypes.ArrowFunctionExpression
        | BabelTypes.ObjectMethod
      >
    ) {
      if (
        path.parent.type === 'Program' &&
        !BabelTypes.isArrowFunctionExpression(path.node) &&
        !BabelTypes.isObjectMethod(path.node) &&
        path.node.id &&
        path.scope.parent
      ) {
        const hasRecursiveCalls =
          path.scope.parent.bindings[path.node.id.name]?.references > 0;
        if (hasRecursiveCalls) {
          path.node.body.body.unshift(
            BabelTypes.variableDeclaration('const', [
              BabelTypes.variableDeclarator(
                BabelTypes.identifier(path.node.id.name),
                BabelTypes.memberExpression(
                  BabelTypes.thisExpression(),
                  BabelTypes.identifier('_recur')
                )
              ),
            ])
          );
        }
      }
    }

    return {
      visitor: {
        'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod':
          (
            path: BabelCore.NodePath<
              | BabelTypes.FunctionDeclaration
              | BabelTypes.FunctionExpression
              | BabelTypes.ArrowFunctionExpression
              | BabelTypes.ObjectMethod
            >
          ) => {
            prependClosure(path);
            prependRecursiveDeclaration(path);
          },
      },
    };
  }

  const draftExpression = (fun.program.body.find((obj) =>
    BabelTypes.isFunctionDeclaration(obj)
  ) ||
    fun.program.body.find((obj) => BabelTypes.isExpressionStatement(obj)) ||
    undefined) as
    | BabelTypes.FunctionDeclaration
    | BabelTypes.ExpressionStatement
    | undefined;

  if (!draftExpression) throw new Error('weird draft expression bug'); // [TO DO] temporary

  const expression = BabelTypes.isFunctionDeclaration(draftExpression)
    ? draftExpression
    : draftExpression.expression;

  if (
    !BabelTypes.isFunctionDeclaration(expression) &&
    !BabelTypes.isFunctionExpression(expression) &&
    !BabelTypes.isObjectMethod(expression)
  )
    throw new Error('weird type bug'); // [TO DO] temporary

  const workletFunction = BabelTypes.functionExpression(
    BabelTypes.identifier(name),
    expression.params,
    expression.body
  );

  const code = generate(workletFunction).code;

  if (!inputMap) throw new Error('temporary Error'); // temporary [TO DO]

  if (shouldGenerateSourceMap()) {
    // Clear contents array (should be empty anyways)
    inputMap.sourcesContent = [];
    // Include source contents in source map, because Flipper/iframe is not
    // allowed to read files from disk.
    for (const sourceFile of inputMap.sources) {
      inputMap.sourcesContent.push(
        fs.readFileSync(sourceFile).toString('utf-8')
      );
    }
  }

  const includeSourceMap = shouldGenerateSourceMap();

  const transformed = transformSync(code, {
    plugins: [prependClosureVariablesIfNecessary()],
    compact: !includeSourceMap,
    sourceMaps: includeSourceMap,
    inputSourceMap: inputMap,
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  });

  if (!transformed) throw new Error('transformed is null!\n');

  let sourceMap;
  if (includeSourceMap) {
    sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
    // sourcesContent field contains a full source code of the file which contains the worklet
    // and is not needed by the source map interpreter in order to symbolicate a stack trace.
    // Therefore, we remove it to reduce the bandwith and avoid sending it potentially multiple times
    // in files that contain multiple worklets. Along with sourcesContenBabelTypes.
    delete sourceMap.sourcesContent;
  }

  return [transformed.code, JSON.stringify(sourceMap)];
}

function makeWorkletName(
  fun: BabelCore.NodePath<
    | BabelTypes.FunctionDeclaration
    | BabelTypes.FunctionExpression
    | BabelTypes.ObjectMethod
    | BabelTypes.ArrowFunctionExpression
  >
): string {
  if (BabelTypes.isObjectMethod(fun.node)) {
    // @ts-expect-error [TO DO] how to fix it cheap?
    return fun.node.key.name;
  }
  if (BabelTypes.isFunctionDeclaration(fun.node) && fun.node.id) {
    return fun.node.id.name;
  }
  if (
    BabelTypes.isFunctionExpression(fun.node) &&
    BabelTypes.isIdentifier(fun.node.id)
  ) {
    return fun.node.id.name;
  }
  return 'anonymous'; // fallback for ArrowFunctionExpression and unnamed FunctionExpression
}

function makeWorklet(
  fun: BabelCore.NodePath<
    | BabelTypes.FunctionDeclaration
    | BabelTypes.FunctionExpression
    | BabelTypes.ObjectMethod
    | BabelTypes.ArrowFunctionExpression
  >,
  state: BabelCore.PluginPass
): BabelTypes.FunctionExpression {
  // Returns a new FunctionExpression which is a workletized version of provided
  // FunctionDeclaration, FunctionExpression, ArrowFunctionExpression or ObjectMethod.

  const functionName = makeWorkletName(fun);

  const closure = new Map<string, BabelTypes.Identifier>();

  // remove 'worklet'; directive before generating string
  fun.traverse({
    DirectiveLiteral(path) {
      if (path.node.value === 'worklet' && path.getFunctionParent() === fun) {
        path.parentPath.remove();
      }
    },
  });

  // We use copy because some of the plugins don't update bindings and
  // some even break them

  const codeObject = generate(fun.node, {
    sourceMaps: true,
    // //@ts-ignore [TO DO] how to type it?
    sourceFileName: state.file.opts.filename as string | undefined,
  });

  // We need to add a newline at the end, because there could potentially be a
  // comment after the function that gets included here, and then the closing
  // bracket would become part of the comment thus resulting in an error, since
  // there is a missing closing brackeBabelTypes.
  const code =
    '(' +
    (BabelTypes.isObjectMethod(fun) ? 'function ' : '') +
    codeObject.code +
    '\n)';

  const transformed = transformSync(code, {
    // @ts-ignore [TO DO]
    filename: state.file.opts.filename,
    presets: ['@babel/preset-typescript'],
    plugins: [
      '@babel/plugin-transform-shorthand-properties',
      '@babel/plugin-transform-arrow-functions',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      ['@babel/plugin-transform-template-literals', { loose: true }],
    ],
    ast: true,
    babelrc: false,
    configFile: false,
    inputSourceMap: codeObject.map,
  });

  if (!transformed || !transformed.ast)
    throw new Error('null ast weird exception\n'); // this is temporary [TO DO]

  traverse(transformed.ast, {
    Identifier(path) {
      if (!path.isReferencedIdentifier()) return;
      const name = path.node.name;
      if (
        globals.has(name) ||
        (!BabelTypes.isArrowFunctionExpression(fun.node) &&
          !BabelTypes.isObjectMethod(fun.node) &&
          fun.node.id &&
          fun.node.id.name === name)
      ) {
        return;
      }

      const parentNode = path.parent;

      if (
        parentNode.type === 'MemberExpression' &&
        parentNode.property === path.node &&
        !parentNode.computed
      ) {
        return;
      }

      if (
        parentNode.type === 'ObjectProperty' &&
        path.parentPath.parent.type === 'ObjectExpression' &&
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
      closure.set(name, path.node);
    },
  });

  const variables = Array.from(closure.values());

  const privateFunctionId = BabelTypes.identifier('_f');
  const clone = BabelTypes.cloneNode(fun.node);
  const funExpression = BabelTypes.isBlockStatement(clone.body)
    ? BabelTypes.functionExpression(null, clone.params, clone.body)
    : clone;

  const [funString, sourceMapString] = buildWorkletString(
    transformed.ast,
    variables,
    functionName,
    transformed.map
  );
  if (!funString) throw new Error('funString is undefined/null\n'); // this is temporary [TO DO]
  const workletHash = hash(funString);

  let location = state.file.opts.filename; // @ts-expect-error [TO DO]
  if (state.opts && state.opts.relativeSourceLocation) {
    const path = require('path');
    location = path.relative(state.cwd, location);
  }

  let lineOffset = 1;
  if (closure.size > 0) {
    // When worklet captures some variables, we append closure destructing at
    // the beginning of the function body. This effectively results in line
    // numbers shifting by the number of captured variables (size of the
    // closure) + 2 (for the opening and closing brackets of the destruct
    // statement)
    lineOffset -= closure.size + 2;
  }

  const pathForStringDefinitions = fun.parentPath.isProgram()
    ? fun
    : fun.findParent((path) => path.parentPath.isProgram());

  const initDataId =
    pathForStringDefinitions.parentPath.scope.generateUidIdentifier(
      `worklet_${workletHash}_init_data`
    );

  const initDataObjectExpression = BabelTypes.objectExpression([
    BabelTypes.objectProperty(
      BabelTypes.identifier('code'),
      BabelTypes.stringLiteral(funString as string)
    ), // [TO DO] this is temporary
    BabelTypes.objectProperty(
      BabelTypes.identifier('location'),
      BabelTypes.stringLiteral(location as string)
    ),
  ]);

  if (sourceMapString) {
    initDataObjectExpression.properties.push(
      BabelTypes.objectProperty(
        BabelTypes.identifier('sourceMap'),
        BabelTypes.stringLiteral(sourceMapString)
      )
    );
  }

  pathForStringDefinitions.insertBefore(
    BabelTypes.variableDeclaration('const', [
      BabelTypes.variableDeclarator(initDataId, initDataObjectExpression),
    ])
  );

  if (
    BabelTypes.isFunctionDeclaration(funExpression) ||
    BabelTypes.isObjectMethod(funExpression)
  )
    throw new Error('fun expression bug\n'); // [TO DO] temporary

  const statements: Array<
    | BabelTypes.VariableDeclaration
    | BabelTypes.ExpressionStatement
    | BabelTypes.ReturnStatement
  > = [
    BabelTypes.variableDeclaration('const', [
      BabelTypes.variableDeclarator(privateFunctionId, funExpression),
    ]),
    BabelTypes.expressionStatement(
      BabelTypes.assignmentExpression(
        '=',
        BabelTypes.memberExpression(
          privateFunctionId,
          BabelTypes.identifier('_closure'),
          false
        ),
        BabelTypes.objectExpression(
          variables.map((variable) =>
            BabelTypes.objectProperty(
              BabelTypes.identifier(variable.name),
              variable,
              false,
              true
            )
          )
        )
      )
    ),
    BabelTypes.expressionStatement(
      BabelTypes.assignmentExpression(
        '=',
        BabelTypes.memberExpression(
          privateFunctionId,
          BabelTypes.identifier('__initData'),
          false
        ),
        initDataId
      )
    ),
    BabelTypes.expressionStatement(
      BabelTypes.assignmentExpression(
        '=',
        BabelTypes.memberExpression(
          privateFunctionId,
          BabelTypes.identifier('__workletHash'),
          false
        ),
        BabelTypes.numericLiteral(workletHash)
      )
    ),
  ];

  if (!isRelease()) {
    statements.unshift(
      BabelTypes.variableDeclaration('const', [
        BabelTypes.variableDeclarator(
          BabelTypes.identifier('_e'),
          BabelTypes.arrayExpression([
            BabelTypes.newExpression(BabelTypes.identifier('Error'), []),
            BabelTypes.numericLiteral(lineOffset),
            BabelTypes.numericLiteral(-20), // the placement of opening bracket after Exception in line that defined '_e' variable
          ])
        ),
      ])
    );
    statements.push(
      BabelTypes.expressionStatement(
        BabelTypes.assignmentExpression(
          '=',
          BabelTypes.memberExpression(
            privateFunctionId,
            BabelTypes.identifier('__stackDetails'),
            false
          ),
          BabelTypes.identifier('_e')
        )
      )
    );
  }

  statements.push(BabelTypes.returnStatement(privateFunctionId));

  const newFun = BabelTypes.functionExpression(
    // !BabelTypes.isArrowFunctionExpression(fun.node) ? fun.node.id : undefined, // [TO DO] --- this never worked
    undefined,
    [],
    BabelTypes.blockStatement(statements)
  );

  return newFun;
}

function processWorkletFunction(
  fun: BabelCore.NodePath<
    | BabelTypes.FunctionDeclaration
    | BabelTypes.FunctionExpression
    | BabelTypes.ArrowFunctionExpression
  >,
  state: BabelCore.PluginPass
) {
  // Replaces FunctionDeclaration, FunctionExpression or ArrowFunctionExpression
  // with a workletized version of itself.

  if (!BabelTypes.isFunctionParent(fun)) {
    return;
  }

  const newFun = makeWorklet(fun, state);

  const replacement = BabelTypes.callExpression(newFun, []);

  // we check if function needs to be assigned to variable declaration.
  // This is needed if function definition directly in a scope. Some other ways
  // where function definition can be used is for example with variable declaration:
  // const ggg = function foo() { }
  // ^ in such a case we don't need to define variable for the function
  const needDeclaration =
    BabelTypes.isScopable(fun.parent) ||
    BabelTypes.isExportNamedDeclaration(fun.parent);
  fun.replaceWith(
    !BabelTypes.isArrowFunctionExpression(fun.node) &&
      fun.node.id &&
      needDeclaration
      ? BabelTypes.variableDeclaration('const', [
          BabelTypes.variableDeclarator(fun.node.id, replacement),
        ])
      : replacement
  );
}

function processWorkletObjectMethod(
  path: BabelCore.NodePath<BabelTypes.ObjectMethod>,
  state: BabelCore.PluginPass
) {
  // Replaces ObjectMethod with a workletized version of itself.

  if (!BabelTypes.isFunctionParent(path)) return;

  const newFun = makeWorklet(path, state);

  const replacement = BabelTypes.objectProperty(
    BabelTypes.identifier(
      BabelTypes.isIdentifier(path.node.key) ? path.node.key.name : ''
    ),
    BabelTypes.callExpression(newFun, [])
  );

  path.replaceWith(replacement);
}

function processIfWorkletNode(
  fun: BabelCore.NodePath<
    | BabelTypes.FunctionDeclaration
    | BabelTypes.FunctionExpression
    | BabelTypes.ArrowFunctionExpression
  >,
  state: BabelCore.PluginPass
) {
  fun.traverse({
    DirectiveLiteral(path) {
      const value = path.node.value;
      if (
        value === 'worklet' &&
        path.getFunctionParent() === fun &&
        BabelTypes.isBlockStatement(fun.node.body)
      ) {
        // make sure "worklet" is listed among directives for the fun
        // this is necessary as because of some bug, babel will attempt to
        // process replaced function if it is nested inside another function
        const directives = fun.node.body.directives;
        if (
          directives &&
          directives.length > 0 &&
          directives.some(
            (directive) =>
              BabelTypes.isDirectiveLiteral(directive.value) &&
              directive.value.value === 'worklet'
          )
        ) {
          processWorkletFunction(fun, state);
        }
      }
    },
  });
}

function processIfGestureHandlerEventCallbackFunctionNode(
  fun: BabelCore.NodePath<
    | BabelTypes.FunctionDeclaration
    | BabelTypes.FunctionExpression
    | BabelTypes.ArrowFunctionExpression
  >,
  state: BabelCore.PluginPass
) {
  // Auto-workletizes React Native Gesture Handler callback functions.
  // Detects `Gesture.Tap().onEnd(<fun>)` or similar, but skips `something.onEnd(<fun>)`.
  // Supports method chaining as well, e.g. `Gesture.Tap().onStart(<fun1>).onUpdate(<fun2>).onEnd(<fun3>)`.

  // Example #1: `Gesture.Tap().onEnd(<fun>)`
  /*
  CallExpression(
    callee: MemberExpression(
      object: CallExpression(
        callee: MemberExpression(
          object: Identifier('Gesture')
          property: Identifier('Tap')
        )
      )
      property: Identifier('onEnd')
    )
    arguments: [fun]
  )
  */

  // Example #2: `Gesture.Tap().onStart(<fun1>).onUpdate(<fun2>).onEnd(<fun3>)`
  /*
  CallExpression(
    callee: MemberExpression(
      object: CallExpression(
        callee: MemberExpression(
          object: CallExpression(
            callee: MemberExpression(
              object: CallExpression(
                callee: MemberExpression(
                  object: Identifier('Gesture')
                  property: Identifier('Tap')
                )
              )
              property: Identifier('onStart')
            )
            arguments: [fun1]
          )
          property: Identifier('onUpdate')
        )
        arguments: [fun2]
      )
      property: Identifier('onEnd')
    )
    arguments: [fun3]
  )
  */

  if (
    BabelTypes.isCallExpression(fun.parent) &&
    isGestureObjectEventCallbackMethod(
      fun.parent.callee as BabelTypes.Expression
    ) // [TO DO] this is temporary
  ) {
    processWorkletFunction(fun, state);
  }
}

function isGestureObjectEventCallbackMethod(node: BabelTypes.Expression) {
  // Checks if node matches the pattern `Gesture.Foo()[*].onBar`
  // where `[*]` represents any number of method calls.
  return (
    BabelTypes.isMemberExpression(node) &&
    BabelTypes.isIdentifier(node.property) &&
    gestureHandlerBuilderMethods.has(node.property.name) &&
    containsGestureObject(node.object)
  );
}

function containsGestureObject(node: BabelTypes.Expression) {
  // Checks if node matches the pattern `Gesture.Foo()[*]`
  // where `[*]` represents any number of chained method calls, like `.something(42)`.

  // direct call
  if (isGestureObject(node)) {
    return true;
  }

  // method chaining
  if (
    BabelTypes.isCallExpression(node) &&
    BabelTypes.isMemberExpression(node.callee) &&
    containsGestureObject(node.callee.object)
  ) {
    return true;
  }

  return false;
}

function isGestureObject(node: BabelTypes.Expression) {
  // Checks if node matches `Gesture.Tap()` or similar.
  /*
  node: CallExpression(
    callee: MemberExpression(
      object: Identifier('Gesture')
      property: Identifier('Tap')
    )
  )
  */
  return (
    BabelTypes.isCallExpression(node) &&
    BabelTypes.isMemberExpression(node.callee) &&
    BabelTypes.isIdentifier(node.callee.object) &&
    node.callee.object.name === 'Gesture' &&
    BabelTypes.isIdentifier(node.callee.property) &&
    gestureHandlerGestureObjects.has(node.callee.property.name)
  );
}

function processWorklets(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  state: BabelCore.PluginPass
) {
  // const callee =
  //   path.node.callee.type === 'SequenceExpression'
  //     ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
  //     : path.node.callee;

  const callee = BabelTypes.isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

  const name = BabelTypes.isMemberExpression(callee) // @ts-expect-error [TO DO]
    ? callee.property.name // @ts-expect-error [TO DO]
    : callee.name;

  if (
    objectHooks.has(name) &&
    BabelTypes.isObjectExpression(
      (path.get('arguments.0') as BabelCore.NodePath<BabelTypes.Expression>)
        .node
    )
  ) {
    const properties = path.get('arguments.0.properties') as Array<
      BabelCore.NodePath<BabelTypes.ObjectMethod | BabelTypes.ObjectProperty>
    >;
    for (const property of properties) {
      if (BabelTypes.isObjectMethod(property.node)) {
        processWorkletObjectMethod(
          property as BabelCore.NodePath<BabelTypes.ObjectMethod>,
          state
        );
      } else {
        const value = property.get(
          'value'
        ) as BabelCore.NodePath<BabelTypes.Expression>;
        processWorkletFunction(
          value as BabelCore.NodePath<
            | BabelTypes.FunctionDeclaration
            | BabelTypes.FunctionExpression
            | BabelTypes.ArrowFunctionExpression
          >,
          state
        ); // temporarily given 3 types [TO DO]
      }
    }
  } else {
    const indexes = functionArgsToWorkletize.get(name);
    if (Array.isArray(indexes)) {
      indexes.forEach((index) => {
        processWorkletFunction(
          path.get(`arguments.${index}`) as BabelCore.NodePath<
            | BabelTypes.FunctionDeclaration
            | BabelTypes.FunctionExpression
            | BabelTypes.ArrowFunctionExpression
          >,
          state
        ); // temporarily given 3 types [TO DO]
      });
    }
  }
}

module.exports = function (): BabelCore.PluginItem {
  return {
    pre() {
      // allows adding custom globals such as host-functions
      if (this.opts != null && Array.isArray(this.opts.globals)) {
        this.opts.globals.forEach((name: string) => {
          globals.add(name);
        });
      }
    },
    visitor: {
      CallExpression: {
        enter(
          path: BabelCore.NodePath<BabelTypes.CallExpression>,
          state: BabelCore.PluginPass
        ) {
          processWorklets(path, state);
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        enter(
          path: BabelCore.NodePath<
            | BabelTypes.FunctionDeclaration
            | BabelTypes.FunctionExpression
            | BabelTypes.ArrowFunctionExpression
          >,
          state: BabelCore.PluginPass
        ) {
          processIfWorkletNode(path, state);
          processIfGestureHandlerEventCallbackFunctionNode(path, state);
        },
      },
    },
  };
};
