/* eslint-disable @typescript-eslint/no-var-requires */
import type { NodePath } from '@babel/core';
import { transformSync, traverse } from '@babel/core';
import generate from '@babel/generator';
import type {
  ArrowFunctionExpression,
  File as BabelFile,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  ObjectMethod,
  ReturnStatement,
  VariableDeclaration,
} from '@babel/types';
import {
  arrayExpression,
  assignmentExpression,
  blockStatement,
  cloneNode,
  expressionStatement,
  functionExpression,
  identifier,
  isBlockStatement,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isObjectMethod,
  isObjectProperty,
  isProgram,
  memberExpression,
  newExpression,
  numericLiteral,
  objectExpression,
  objectProperty,
  returnStatement,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import { relative } from 'path';
import { buildWorkletString } from './buildWorkletString';
import { globals } from './commonObjects';
import type { ReanimatedPluginPass } from './types';
import { isRelease } from './utils';

const version = require('../../package.json').version;

export function makeWorklet(
  fun: NodePath<
    | FunctionDeclaration
    | FunctionExpression
    | ObjectMethod
    | ArrowFunctionExpression
  >,
  state: ReanimatedPluginPass
): FunctionExpression {
  // Returns a new FunctionExpression which is a workletized version of provided
  // FunctionDeclaration, FunctionExpression, ArrowFunctionExpression or ObjectMethod.

  const functionName = makeWorkletName(fun);

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
  assert(state.file.opts.filename, "'state.file.opts.filename' is undefined");

  const codeObject = generate(fun.node, {
    sourceMaps: true,
    sourceFileName: state.file.opts.filename,
  });

  // We need to add a newline at the end, because there could potentially be a
  // comment after the function that gets included here, and then the closing
  // bracket would become part of the comment thus resulting in an error, since
  // there is a missing closing bracket.
  codeObject.code =
    '(' + (isObjectMethod(fun) ? 'function ' : '') + codeObject.code + '\n)';

  const transformed = transformSync(codeObject.code, {
    filename: state.file.opts.filename,
    presets: [require.resolve('@babel/preset-typescript')],
    plugins: [
      require.resolve('@babel/plugin-transform-shorthand-properties'),
      require.resolve('@babel/plugin-transform-arrow-functions'),
      require.resolve('@babel/plugin-proposal-optional-chaining'),
      require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
      [
        require.resolve('@babel/plugin-transform-template-literals'),
        { loose: true },
      ],
    ],
    ast: true,
    babelrc: false,
    configFile: false,
    inputSourceMap: codeObject.map,
  });

  assert(transformed, "'transformed' is undefined");
  assert(transformed.ast, "'transformed.ast' is undefined");

  const variables = makeArrayFromCapturedBindings(transformed.ast, fun);

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
  assert(funString, "'funString' is undefined");
  const workletHash = hash(funString);

  let lineOffset = 1;
  if (variables.length > 0) {
    // When worklet captures some variables, we append closure destructing at
    // the beginning of the function body. This effectively results in line
    // numbers shifting by the number of captured variables (size of the
    // closure) + 2 (for the opening and closing brackets of the destruct
    // statement)
    lineOffset -= variables.length + 2;
  }

  const pathForStringDefinitions = fun.parentPath.isProgram()
    ? fun
    : fun.findParent((path) => isProgram(path.parentPath));
  assert(pathForStringDefinitions, "'pathForStringDefinitions' is null");
  assert(
    pathForStringDefinitions.parentPath,
    "'pathForStringDefinitions.parentPath' is null"
  );

  const initDataId =
    pathForStringDefinitions.parentPath.scope.generateUidIdentifier(
      `worklet_${workletHash}_init_data`
    );

  const initDataObjectExpression = objectExpression([
    objectProperty(identifier('code'), stringLiteral(funString)),
  ]);

  // When testing with jest I noticed that environment variables are set later
  // than some functions are evaluated. E.g. this cannot be above this function
  // because it would always evaluate to true.
  const shouldInjectLocation = !isRelease();
  if (shouldInjectLocation) {
    let location = state.file.opts.filename;
    if (state.opts.relativeSourceLocation) {
      location = relative(state.cwd, location);
    }

    initDataObjectExpression.properties.push(
      objectProperty(identifier('location'), stringLiteral(location))
    );
  }

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

  assert(
    !isFunctionDeclaration(funExpression),
    "'funExpression' is a 'FunctionDeclaration'"
  );
  assert(
    !isObjectMethod(funExpression),
    "'funExpression' is an 'ObjectMethod'"
  );

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
            newExpression(
              memberExpression(identifier('global'), identifier('Error')),
              []
            ),
            numericLiteral(lineOffset),
            numericLiteral(-27), // the placement of opening bracket after Exception in line that defined '_e' variable
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
    if (shouldInjectVersion()) {
      statements.push(
        expressionStatement(
          assignmentExpression(
            '=',
            memberExpression(privateFunctionId, identifier('__version'), false),
            stringLiteral(version)
          )
        )
      );
    }
  }

  statements.push(returnStatement(privateFunctionId));

  const newFun = functionExpression(undefined, [], blockStatement(statements));

  return newFun;
}

function shouldInjectVersion() {
  // We don't inject version in release since cache is reset there anyway
  if (isRelease()) {
    return false;
  }

  // We don't want to pollute tests with current version number so we disable it
  // for all tests (except one)
  if (process.env.REANIMATED_JEST_DISABLE_VERSION === 'jest') {
    return false;
  }

  return true;
}

function hash(str: string) {
  let i = str.length;
  let hash1 = 5381;
  let hash2 = 52711;

  while (i--) {
    const char = str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash1 = (hash1 * 33) ^ char;
    // eslint-disable-next-line no-bitwise
    hash2 = (hash2 * 33) ^ char;
  }

  // eslint-disable-next-line no-bitwise
  return (hash1 >>> 0) * 4096 + (hash2 >>> 0);
}

function makeWorkletName(
  fun: NodePath<
    | FunctionDeclaration
    | FunctionExpression
    | ObjectMethod
    | ArrowFunctionExpression
  >
) {
  if (isObjectMethod(fun.node) && 'name' in fun.node.key) {
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

function makeArrayFromCapturedBindings(
  ast: BabelFile,
  fun: NodePath<
    | FunctionDeclaration
    | FunctionExpression
    | ObjectMethod
    | ArrowFunctionExpression
  >
) {
  const closure = new Map<string, Identifier>();

  // this traversal looks for variables to capture
  traverse(ast, {
    Identifier(path) {
      // we only capture variables that were declared outside of the scope
      if (!path.isReferencedIdentifier()) {
        return;
      }
      const name = path.node.name;
      // if the function is named and was added to globals we don't want to add it to closure
      // hence we check if identifier has that name
      if (globals.has(name)) {
        return;
      }
      if (
        'id' in fun.node &&
        fun.node.id &&
        fun.node.id.name === name // we don't want to capture function's own name
      ) {
        return;
      }

      const parentNode = path.parent;

      if (
        isMemberExpression(parentNode) &&
        parentNode.property === path.node &&
        !parentNode.computed
      ) {
        return;
      }

      if (
        isObjectProperty(parentNode) &&
        isObjectExpression(path.parentPath.parent) &&
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

  return Array.from(closure.values());
}
