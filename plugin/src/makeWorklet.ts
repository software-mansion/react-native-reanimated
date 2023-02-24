import { NodePath, PluginPass, transformSync, traverse } from '@babel/core';
import generate from '@babel/generator';
import {
  ObjectMethod,
  isObjectMethod,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  identifier,
  Identifier,
  objectProperty,
  isArrowFunctionExpression,
  variableDeclaration,
  variableDeclarator,
  cloneNode,
  isBlockStatement,
  functionExpression,
  objectExpression,
  stringLiteral,
  isFunctionDeclaration,
  VariableDeclaration,
  ExpressionStatement,
  ReturnStatement,
  expressionStatement,
  assignmentExpression,
  memberExpression,
  numericLiteral,
  arrayExpression,
  newExpression,
  returnStatement,
  blockStatement,
  isFunctionExpression,
  isIdentifier,
  File as BabelTypesFile,
  objectPattern,
  thisExpression,
  isExpression,
  isExpressionStatement,
} from '@babel/types';
import { hash, isRelease, shouldGenerateSourceMap } from './commonFunctions';
import { BabelMapType } from './commonInterfaces';
import { globals } from './commonObjects';
import * as convertSourceMap from 'convert-source-map';
import * as fs from 'fs';
import { assertIsDefined } from './asserts';

function makeWorkletName(
  fun: NodePath<
    | FunctionDeclaration
    | FunctionExpression
    | ObjectMethod
    | ArrowFunctionExpression
  >
): string {
  if (isObjectMethod(fun.node)) {
    // @ts-expect-error [TO DO] how to fix it cheap?
    return fun.node.key.name;
  }
  if (isFunctionDeclaration(fun.node) && fun.node.id) {
    return fun.node.id.name;
  }
  if (isFunctionExpression(fun.node) && isIdentifier(fun.node.id)) {
    return fun.node.id.name;
  }
  return 'anonymous'; // fallback for ArrowFunctionExpression and unnamed FunctionExpression
}

function buildWorkletString(
  fun: BabelTypesFile,
  closureVariables: Array<Identifier>,
  name: string,
  inputMap: BabelMapType | null | undefined
): Array<string | null | undefined> {
  function prependClosureVariablesIfNecessary() {
    const closureDeclaration = variableDeclaration('const', [
      variableDeclarator(
        objectPattern(
          closureVariables.map((variable) =>
            objectProperty(
              identifier(variable.name),
              identifier(variable.name),
              false,
              true
            )
          )
        ),
        memberExpression(thisExpression(), identifier('_closure'))
      ),
    ]);

    function prependClosure(
      path: NodePath<
        | FunctionDeclaration
        | FunctionExpression
        | ArrowFunctionExpression
        | ObjectMethod
      >
    ) {
      if (closureVariables.length === 0 || path.parent.type !== 'Program') {
        return;
      }

      if (!isExpression(path.node.body))
        path.node.body.body.unshift(closureDeclaration);
    }

    function prependRecursiveDeclaration(
      path: NodePath<
        | FunctionDeclaration
        | FunctionExpression
        | ArrowFunctionExpression
        | ObjectMethod
      >
    ) {
      if (
        path.parent.type === 'Program' &&
        !isArrowFunctionExpression(path.node) &&
        !isObjectMethod(path.node) &&
        path.node.id &&
        path.scope.parent
      ) {
        const hasRecursiveCalls =
          path.scope.parent.bindings[path.node.id.name]?.references > 0;
        if (hasRecursiveCalls) {
          path.node.body.body.unshift(
            variableDeclaration('const', [
              variableDeclarator(
                identifier(path.node.id.name),
                memberExpression(thisExpression(), identifier('_recur'))
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
            path: NodePath<
              | FunctionDeclaration
              | FunctionExpression
              | ArrowFunctionExpression
              | ObjectMethod
            >
          ) => {
            prependClosure(path);
            prependRecursiveDeclaration(path);
          },
      },
    };
  }

  const draftExpression = (fun.program.body.find((obj) =>
    isFunctionDeclaration(obj)
  ) ||
    fun.program.body.find((obj) => isExpressionStatement(obj)) ||
    undefined) as FunctionDeclaration | ExpressionStatement | undefined;

  assertIsDefined(draftExpression); // [TO DO] temporary

  const expression = isFunctionDeclaration(draftExpression)
    ? draftExpression
    : draftExpression.expression;

  if (
    !isFunctionDeclaration(expression) &&
    !isFunctionExpression(expression) &&
    !isObjectMethod(expression)
  )
    throw new Error(
      "'expression' is not FunctionDeclaration or FunctionExpression or ObjectMethod"
    ); // [TO DO] temporary

  const workletFunction = functionExpression(
    identifier(name),
    expression.params,
    expression.body
  );

  const code = generate(workletFunction).code;

  assertIsDefined(inputMap); // temporary [TO DO]

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

  assertIsDefined(transformed); // temporary [TO DO]

  let sourceMap;
  if (includeSourceMap) {
    sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
    // sourcesContent field contains a full source code of the file which contains the worklet
    // and is not needed by the source map interpreter in order to symbolicate a stack trace.
    // Therefore, we remove it to reduce the bandwith and avoid sending it potentially multiple times
    // in files that contain multiple worklets. Along with sourcesContent.
    delete sourceMap.sourcesContent;
  }

  return [transformed.code, JSON.stringify(sourceMap)];
}

export function makeWorklet(
  fun: NodePath<
    | FunctionDeclaration
    | FunctionExpression
    | ObjectMethod
    | ArrowFunctionExpression
  >,
  state: PluginPass
): FunctionExpression {
  // Returns a new FunctionExpression which is a workletized version of provided
  // FunctionDeclaration, FunctionExpression, ArrowFunctionExpression or ObjectMethod.

  const functionName = makeWorkletName(fun);

  const closure = new Map<string, Identifier>();

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
    sourceFileName: state.file.opts.filename as string | undefined,
  });

  // We need to add a newline at the end, because there could potentially be a
  // comment after the function that gets included here, and then the closing
  // bracket would become part of the comment thus resulting in an error, since
  // there is a missing closing brackeBabelTypes.
  const code =
    '(' + (isObjectMethod(fun) ? 'function ' : '') + codeObject.code + '\n)';

  const transformed = transformSync(code, {
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

  assertIsDefined(transformed); // temporary [TO DO]
  assertIsDefined(transformed.ast); // temporary [TO DO]

  traverse(transformed.ast, {
    Identifier(path) {
      if (!path.isReferencedIdentifier()) return;
      const name = path.node.name;
      if (
        globals.has(name) ||
        (!isArrowFunctionExpression(fun.node) &&
          !isObjectMethod(fun.node) &&
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

  const privateFunctionId = identifier('_f');
  const clone = cloneNode(fun.node);
  const funExpression = isBlockStatement(clone.body)
    ? functionExpression(null, clone.params, clone.body)
    : clone;

  const [funString, sourceMapString] = buildWorkletString(
    transformed.ast,
    variables,
    functionName,
    transformed.map
  );

  assertIsDefined(funString); // temporary [TO DO]

  const workletHash = hash(funString);

  let location = state.file.opts.filename; // @ts-expect-error [TO DO]
  if (state.opts && state.opts.relativeSourceLocation) {
    const path = require('path');
    location = path.relative(state.cwd, location);
  }

  assertIsDefined(location); // temporary [TO DO]

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

  const initDataObjectExpression = objectExpression([
    objectProperty(identifier('code'), stringLiteral(funString)),
    objectProperty(identifier('location'), stringLiteral(location)),
  ]);

  if (sourceMapString) {
    initDataObjectExpression.properties.push(
      objectProperty(identifier('sourceMap'), stringLiteral(sourceMapString))
    );
  }

  pathForStringDefinitions.insertBefore(
    variableDeclaration('const', [
      variableDeclarator(initDataId, initDataObjectExpression),
    ])
  );

  if (isFunctionDeclaration(funExpression) || isObjectMethod(funExpression))
    throw new Error(
      "'funExpression' is not a FunctionDeclaraton or ObjectMethod\n"
    ); // [TO DO] temporary

  const statements: Array<
    VariableDeclaration | ExpressionStatement | ReturnStatement
  > = [
    variableDeclaration('const', [
      variableDeclarator(privateFunctionId, funExpression),
    ]),
    expressionStatement(
      assignmentExpression(
        '=',
        memberExpression(privateFunctionId, identifier('_closure'), false),
        objectExpression(
          variables.map((variable) =>
            objectProperty(identifier(variable.name), variable, false, true)
          )
        )
      )
    ),
    expressionStatement(
      assignmentExpression(
        '=',
        memberExpression(privateFunctionId, identifier('__initData'), false),
        initDataId
      )
    ),
    expressionStatement(
      assignmentExpression(
        '=',
        memberExpression(privateFunctionId, identifier('__workletHash'), false),
        numericLiteral(workletHash)
      )
    ),
  ];

  if (!isRelease()) {
    statements.unshift(
      variableDeclaration('const', [
        variableDeclarator(
          identifier('_e'),
          arrayExpression([
            newExpression(identifier('Error'), []),
            numericLiteral(lineOffset),
            numericLiteral(-20), // the placement of opening bracket after Exception in line that defined '_e' variable
          ])
        ),
      ])
    );
    statements.push(
      expressionStatement(
        assignmentExpression(
          '=',
          memberExpression(
            privateFunctionId,
            identifier('__stackDetails'),
            false
          ),
          identifier('_e')
        )
      )
    );
  }

  statements.push(returnStatement(privateFunctionId));

  const newFun = functionExpression(
    // !isArrowFunctionExpression(fun.node) ? fun.node.id : undefined, // this never worked [TO DO]
    undefined,
    [],
    blockStatement(statements)
  );

  return newFun;
}
