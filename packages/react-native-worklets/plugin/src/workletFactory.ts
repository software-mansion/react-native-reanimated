import type { NodePath } from '@babel/core';
import generate from '@babel/generator';
import type {
  BlockStatement,
  ExpressionStatement,
  FunctionExpression,
  ObjectExpression,
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
  isObjectMethod,
  memberExpression,
  newExpression,
  numericLiteral,
  objectExpression,
  objectPattern,
  objectProperty,
  returnStatement,
  stringLiteral,
  toIdentifier,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import { basename, relative } from 'path';

import { getClosure } from './closure';
import { generateWorkletFile } from './generate';
import { workletTransformSync } from './transform';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';
import { workletClassFactorySuffix } from './types';
import { isRelease } from './utils';
import { buildWorkletString } from './workletStringCode';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const REAL_VERSION = require('../../package.json').version;

const MOCK_VERSION = 'x.y.z';

export function makeWorkletFactory(
  fun: NodePath<WorkletizableFunction>,
  state: WorkletsPluginPass
): {
  factory: FunctionExpression;
  factoryCallParamPack: ObjectExpression;
  workletHash: number;
} {
  // Returns a new FunctionExpression which is a workletized version of provided
  // FunctionDeclaration, FunctionExpression, ArrowFunctionExpression or ObjectMethod.

  removeWorkletDirective(fun);

  // We use copy because some of the plugins don't update bindings and
  // some even break them
  assert(
    state.file.opts.filename,
    '[Reanimated] `state.file.opts.filename` is undefined.'
  );

  const codeObject = generate(fun.node, {
    sourceMaps: true,
    sourceFileName: state.file.opts.filename,
  });

  // We need to add a newline at the end, because there could potentially be a
  // comment after the function that gets included here, and then the closing
  // bracket would become part of the comment thus resulting in an error, since
  // there is a missing closing bracket.
  codeObject.code =
    '(' + (fun.isObjectMethod() ? 'function ' : '') + codeObject.code + '\n)';

  const transformed = workletTransformSync(codeObject.code, {
    extraPlugins: [...extraPlugins, ...(state.opts.extraPlugins ?? [])],
    extraPresets: state.opts.extraPresets,
    filename: state.file.opts.filename,
    ast: true,
    babelrc: false,
    configFile: false,
    inputSourceMap: codeObject.map,
  });

  assert(transformed, '[Reanimated] `transformed` is undefined.');
  assert(transformed.ast, '[Reanimated] `transformed.ast` is undefined.');

  const {
    closureVariables,
    libraryBindingsToImport,
    relativeBindingsToImport,
  } = getClosure(fun, state);

  const clone = cloneNode(fun.node);
  const funExpression = isBlockStatement(clone.body)
    ? functionExpression(
        null,
        clone.params,
        clone.body,
        clone.generator,
        clone.async
      )
    : clone;

  const { workletName, reactName } = makeWorkletName(fun, state);

  let mutatedClosureVariables;
  if (state.opts.bundleMode) {
    mutatedClosureVariables = closureVariables.map((variable) =>
      cloneNode(variable, true)
    );
  } else {
    mutatedClosureVariables = closureVariables;
  }

  // eslint-disable-next-line prefer-const
  let [funString, sourceMapString] = buildWorkletString(
    transformed.ast,
    state,
    mutatedClosureVariables,
    workletName,
    transformed.map
  );
  assert(funString, '[Reanimated] `funString` is undefined.');
  const workletHash = hash(funString);

  let lineOffset = 1;
  if (closureVariables.length > 0) {
    // When worklet captures some variables, we append closure destructing at
    // the beginning of the function body. This effectively results in line
    // numbers shifting by the number of captured variables (size of the
    // closure) + 2 (for the opening and closing brackets of the destruct
    // statement)
    lineOffset -= closureVariables.length + 2;
  }

  const pathForStringDefinitions = fun.parentPath.isProgram()
    ? fun
    : fun.findParent((path) => path.parentPath?.isProgram() ?? false);
  assert(
    pathForStringDefinitions,
    '[Reanimated] `pathForStringDefinitions` is null.'
  );
  assert(
    pathForStringDefinitions.parentPath,
    '[Reanimated] `pathForStringDefinitions.parentPath` is null.'
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
      // It seems there is no designated option to use relative paths in generated sourceMap
      sourceMapString = sourceMapString?.replace(
        state.file.opts.filename,
        location
      );
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

  const shouldIncludeInitData = !state.opts.omitNativeOnlyData;

  if (shouldIncludeInitData && !state.opts.bundleMode) {
    const initDataDeclaration = variableDeclaration('const', [
      variableDeclarator(initDataId, initDataObjectExpression),
    ]);
    if (state.opts.limitInitDataHoisting) {
      (fun.getFunctionParent()!.node.body as BlockStatement).body.unshift(
        initDataDeclaration
      );
    } else {
      pathForStringDefinitions.insertBefore(initDataDeclaration);
    }
  }

  assert(
    !isFunctionDeclaration(funExpression),
    '[Reanimated] `funExpression` is a `FunctionDeclaration`.'
  );
  assert(
    !isObjectMethod(funExpression),
    '[Reanimated] `funExpression` is an `ObjectMethod`.'
  );

  const statements: Array<
    VariableDeclaration | ExpressionStatement | ReturnStatement
  > = [
    variableDeclaration('const', [
      variableDeclarator(identifier(reactName), funExpression),
    ]),
    expressionStatement(
      assignmentExpression(
        '=',
        memberExpression(identifier(reactName), identifier('__closure'), false),
        objectExpression(
          closureVariables.map((variable) =>
            !state.opts.bundleMode &&
            variable.name.endsWith(workletClassFactorySuffix)
              ? objectProperty(
                  identifier(variable.name),
                  memberExpression(
                    identifier(
                      variable.name.slice(
                        0,
                        variable.name.length - workletClassFactorySuffix.length
                      )
                    ),
                    identifier(variable.name)
                  )
                )
              : objectProperty(
                  cloneNode(variable, true),
                  cloneNode(variable, true),
                  false,
                  true
                )
          )
        )
      )
    ),
    expressionStatement(
      assignmentExpression(
        '=',
        memberExpression(
          identifier(reactName),
          identifier('__workletHash'),
          false
        ),
        numericLiteral(workletHash)
      )
    ),
  ];

  const shouldInjectVersion = !isRelease();
  if (shouldInjectVersion) {
    statements.push(
      expressionStatement(
        assignmentExpression(
          '=',
          memberExpression(
            identifier(reactName),
            identifier('__pluginVersion')
          ),
          stringLiteral(shouldMockVersion() ? MOCK_VERSION : REAL_VERSION)
        )
      )
    );
  }

  if (shouldIncludeInitData && !state.opts.bundleMode) {
    statements.push(
      expressionStatement(
        assignmentExpression(
          '=',
          memberExpression(
            identifier(reactName),
            identifier('__initData'),
            false
          ),
          cloneNode(initDataId, true)
        )
      )
    );
  }

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
            identifier(reactName),
            identifier('__stackDetails'),
            false
          ),
          identifier('_e')
        )
      )
    );
  }

  statements.push(returnStatement(identifier(reactName)));

  const factoryParams = closureVariables.map((variableId) => {
    const clonedId = cloneNode(variableId, true);
    if (
      !state.opts.bundleMode &&
      clonedId.name.endsWith(workletClassFactorySuffix)
    ) {
      clonedId.name = clonedId.name.slice(
        0,
        clonedId.name.length - workletClassFactorySuffix.length
      );
    }
    return clonedId;
  });

  if (shouldIncludeInitData && !state.opts.bundleMode) {
    factoryParams.unshift(cloneNode(initDataId, true));
  }

  const factoryParamObjectPattern = objectPattern(
    factoryParams.map((param) =>
      objectProperty(
        cloneNode(param, true),
        cloneNode(param, true),
        false,
        true
      )
    )
  );

  const factory = functionExpression(
    identifier(workletName + 'Factory'),
    [factoryParamObjectPattern],
    blockStatement(statements)
  );

  const factoryCallArgs = factoryParams.map((param) => cloneNode(param, true));

  const factoryCallParamPack = objectExpression(
    factoryCallArgs.map((param) =>
      objectProperty(
        cloneNode(param, true),
        cloneNode(param, true),
        false,
        true
      )
    )
  );

  if (state.opts.bundleMode) {
    generateWorkletFile(
      libraryBindingsToImport,
      relativeBindingsToImport,
      factory,
      workletHash,
      state
    );
  }

  // @ts-expect-error We must mark the factory as workletized
  // to avoid further workletization inside the factory.
  factory.workletized = true;

  return { factory, factoryCallParamPack, workletHash };
}

function removeWorkletDirective(fun: NodePath<WorkletizableFunction>): void {
  fun.traverse({
    DirectiveLiteral(nodePath) {
      if (
        nodePath.node.value === 'worklet' &&
        nodePath.getFunctionParent() === fun
      ) {
        nodePath.parentPath.remove();
      }
    },
  });
}

function shouldMockVersion(): boolean {
  // We don't want to pollute tests with current version number so we mock it
  // for all tests (except one)
  return process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION === '1';
}

function hash(str: string): number {
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
  fun: NodePath<WorkletizableFunction>,
  state: WorkletsPluginPass
): { workletName: string; reactName: string } {
  let source = 'unknownFile';

  if (state.file.opts.filename) {
    const filepath = state.file.opts.filename;
    source = basename(filepath);

    // Get the library name from the path.
    const splitFilepath = filepath.split('/');
    const nodeModulesIndex = splitFilepath.indexOf('node_modules');
    if (nodeModulesIndex !== -1) {
      const libraryName = splitFilepath[nodeModulesIndex + 1];
      source = `${libraryName}_${source}`;
    }
  }

  const suffix = `${source}${state.workletNumber++}`;
  let reactName = '';

  if (isObjectMethod(fun.node) && isIdentifier(fun.node.key)) {
    reactName = fun.node.key.name;
  } else if (
    (isFunctionDeclaration(fun.node) || isFunctionExpression(fun.node)) &&
    isIdentifier(fun.node.id)
  ) {
    reactName = fun.node.id.name;
  }

  const workletName = reactName
    ? toIdentifier(`${reactName}_${suffix}`)
    : toIdentifier(suffix);

  // Fallback for ArrowFunctionExpression and unnamed FunctionExpression.
  reactName = reactName || toIdentifier(suffix);

  return { workletName, reactName };
}

const extraPlugins = [
  require.resolve('@babel/plugin-transform-shorthand-properties'),
  require.resolve('@babel/plugin-transform-arrow-functions'),
  require.resolve('@babel/plugin-transform-optional-chaining'),
  require.resolve('@babel/plugin-transform-nullish-coalescing-operator'),
  [
    require.resolve('@babel/plugin-transform-template-literals'),
    { loose: true },
  ],
];
