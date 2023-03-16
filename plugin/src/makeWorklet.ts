import { NodePath, transformSync, traverse } from '@babel/core';
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
  isObjectProperty,
  isMemberExpression,
  isObjectExpression,
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
  isProgram,
  File as BabelFile,
} from '@babel/types';
import { ReanimatedPluginPass } from './commonInterfaces';
import { hash, isRelease, shouldGenerateSourceMap } from './commonFunctions';
import { globals } from './commonObjects';
import { assertIsDefined } from './asserts';
import { buildWorkletString } from './buildWorkletString';
import { relative } from 'path';

function makeWorkletName(
  fun: NodePath<
    | FunctionDeclaration
    | FunctionExpression
    | ObjectMethod
    | ArrowFunctionExpression
  >
): string {
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
): Array<Identifier> {
  const closure = new Map<string, Identifier>();
  // this traverse looks for variables to capture
  traverse(ast as BabelFile, {
    Identifier(path) {
      if (!path.isReferencedIdentifier()) return; // we only capture variables that were declared outside of the scope
      const name = path.node.name;
      if (globals.has(name)) return;
      if (
        'id' in fun.node &&
        fun.node.id &&
        'name' in fun.node.id &&
        fun.node.id.name === name // we don't want to capture function's name in closure
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
          return; // this is for the case that we go too far?
        }
        currentScope = currentScope.parent;
      }
      closure.set(name, path.node);
    },
  });
  return Array.from(closure.values());
}

function makeWorklet(
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

  assertIsDefined(state.file.opts.filename);
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

  assertIsDefined(transformed);
  assertIsDefined(transformed.ast);

  const variables = makeArrayFromCapturedBindings(transformed.ast, fun);

  const privateFunctionId = identifier('_f');
  const clone = cloneNode(fun.node); // why clone here?
  const funExpression = isBlockStatement(clone.body)
    ? functionExpression(null, clone.params, clone.body)
    : clone;

  const [funString, sourceMapString] = buildWorkletString(
    transformed.ast,
    variables,
    functionName,
    transformed.map
  );
  assertIsDefined(funString);
  const workletHash = hash(funString);

  let location = state.file.opts.filename;
  if (state.opts.relativeSourceLocation) {
    location = relative(state.cwd, location);
  }

  let lineOffset = 1;
  if (variables.length > 0) {
    // When worklet captures some variables, we append closure destructing at
    // the beginning of the function body. This effectively results in line
    // numbers shifting by the number of captured variables (size of the
    // closure) + 2 (for the opening and closing brackets of the destruct
    // statement)
    lineOffset -= variables.length + 2;
  }

  // more like path for worklet allocation
  const pathForStringDefinitions = isProgram(fun.parentPath)
    ? fun
    : fun.findParent((path) => isProgram(path.parentPath));

  assertIsDefined(pathForStringDefinitions);
  assertIsDefined(pathForStringDefinitions.parentPath);

  const initDataId =
    pathForStringDefinitions.parentPath.scope.generateUidIdentifier(
      // is it automatically added to the scope?
      `worklet_${workletHash}_init_data`
    );

  const initDataObjectExpression = objectExpression([
    objectProperty(identifier('code'), stringLiteral(funString)),
    objectProperty(identifier('location'), stringLiteral(location)),
    objectProperty(
      identifier('sourceMap'),
      shouldGenerateSourceMap()
        ? stringLiteral(sourceMapString as string)
        : identifier('undefined')
    ),
  ]);

  // to add it before the actual JS function?
  pathForStringDefinitions.insertBefore(
    variableDeclaration('const', [
      variableDeclarator(initDataId, initDataObjectExpression),
    ])
  );

  if (isFunctionDeclaration(funExpression) || isObjectMethod(funExpression))
    throw new Error(
      "'funExpression' is either FunctionDeclaration or ObjectMethod and cannot be used in variableDeclaration\n"
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
            numericLiteral(lineOffset), // [kmagiera]
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
  }

  statements.push(returnStatement(privateFunctionId));

  const newFun = functionExpression(undefined, [], blockStatement(statements));

  return newFun;
}

export { makeWorklet };
