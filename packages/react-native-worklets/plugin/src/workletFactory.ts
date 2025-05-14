import type { NodePath } from '@babel/core';
import { transformFromAstSync } from '@babel/core';
import generate from '@babel/generator';
import type { Binding } from '@babel/traverse';
import type {
  ExpressionStatement,
  Identifier,
  ImportDeclaration,
  ImportSpecifier,
  ObjectExpression,
  ReturnStatement,
  VariableDeclaration,
} from '@babel/types';
import {
  arrayExpression,
  assignmentExpression,
  blockStatement,
  cloneNode,
  exportDefaultDeclaration,
  expressionStatement,
  functionExpression,
  identifier,
  importDeclaration,
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
  program,
  returnStatement,
  stringLiteral,
  toIdentifier,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, dirname, relative, resolve } from 'path';

import { globals } from './globals';
import { workletTransformSync } from './transform';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { workletClassFactorySuffix } from './types';
import { isRelease } from './utils';
import { buildWorkletString } from './workletStringCode';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const REAL_VERSION = require('../../package.json').version;

const MOCK_VERSION = 'x.y.z';

export function makeWorkletFactory(
  fun: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): {
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

  // const { closureVariables, bindingsToImport } = makeArrayFromCapturedBindings(
  //   transformed.ast,
  //   fun,
  //   state
  // );

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

  let [funString, sourceMapString] = buildWorkletString(
    transformed.ast,
    state,
    closureVariables,
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

  const shouldInjectVersion = !isRelease();
  if (shouldInjectVersion) {
    initDataObjectExpression.properties.push(
      objectProperty(
        identifier('version'),
        stringLiteral(shouldMockVersion() ? MOCK_VERSION : REAL_VERSION)
      )
    );
  }

  const shouldIncludeInitData = !state.opts.omitNativeOnlyData;

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

  if (shouldIncludeInitData) {
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

  const factoryParams = [
    cloneNode(initDataId, true),
    ...closureVariables.map((variableId) => {
      const clonedId = cloneNode(variableId, true);
      if (clonedId.name.endsWith(workletClassFactorySuffix)) {
        clonedId.name = clonedId.name.slice(
          0,
          clonedId.name.length - workletClassFactorySuffix.length
        );
      }
      return clonedId;
    }),
  ];

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

  const libraryImports = Array.from(libraryBindingsToImport)
    .filter(
      (binding) =>
        binding.path.isImportSpecifier() &&
        binding.path.parentPath.isImportDeclaration()
    )
    .map((binding) =>
      importDeclaration(
        [cloneNode(binding.path.node as ImportSpecifier, true)],
        stringLiteral(
          (binding.path.parentPath!.node as ImportDeclaration).source.value
        )
      )
    );

  const filesDirPath = resolve(
    dirname(require.resolve('react-native-worklets/package.json')),
    'generated'
  );

  const relativeImports = Array.from(relativeBindingsToImport)
    .filter(
      (binding) =>
        binding.path.isImportSpecifier() &&
        binding.path.parentPath.isImportDeclaration()
    )
    .map((binding) => {
      const resolved = resolve(
        dirname(state.file.opts.filename!),
        (binding.path.parentPath! as NodePath<ImportDeclaration>).node.source
          .value
      );
      const relatived = relative(filesDirPath, resolved);

      console.log('relative resolved', relatived);
      return importDeclaration(
        [cloneNode(binding.path.node as ImportSpecifier, true)],
        stringLiteral(relatived)
      );
    });

  const imports = [...libraryImports, ...relativeImports];
  // const imports = libraryImports;

  const newProg = program([
    ...imports,
    variableDeclaration('const', [
      variableDeclarator(initDataId, initDataObjectExpression),
    ]),
    exportDefaultDeclaration(factory),
  ]);

  const transformedProg = transformFromAstSync(newProg, undefined, {
    filename: state.file.opts.filename,
    presets: ['@babel/preset-typescript'],
    plugins: [],
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  })?.code;

  assert(transformedProg, '[Reanimated] `transformedProg` is undefined.');

  try {
    if (!existsSync(filesDirPath)) {
      mkdirSync(filesDirPath, {});
    }
  } catch (e) {
    // Nothing.
  }

  const dedicatedFilePath = resolve(filesDirPath, `${workletHash}.js`);

  // @ts-expect-error wwww
  if (!state.file.metadata.virtualModules) {
    // @ts-expect-error wwww
    state.file.metadata.virtualModules = new Map();
  }
  // @ts-expect-error wwww
  state.file.metadata.virtualModules.set(dedicatedFilePath, newProg);

  try {
    // If a file exists, abort the process.
    if (!existsSync(dedicatedFilePath)) {
      // temporary
      writeFileSync(dedicatedFilePath, transformedProg);
      console.error('Saved worklet to file ', dedicatedFilePath);
      // console.error('babel time', new Date().toISOString());
    }
  } catch (_e) {
    console.error('Error while writing worklet to file: ', _e);
    // Nothing.
  }

  if (shouldIncludeInitData) {
    pathForStringDefinitions.insertBefore(
      variableDeclaration('const', [
        variableDeclarator(initDataId, initDataObjectExpression),
      ])
    );
  }

  pathForStringDefinitions.parentPath.scope.crawl();

  // @ts-expect-error We must mark the factory as workletized
  // to avoid further workletization inside the factory.
  factory.workletized = true;

  return { factoryCallParamPack, workletHash };
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
  state: ReanimatedPluginPass
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

// function makeArrayFromCapturedBindings(
//   ast: BabelFile,
//   fun: NodePath<WorkletizableFunction>,
//   state: ReanimatedPluginPass
// ): {
//   closureVariables: Identifier[];
//   bindingsToImport: Set<Binding>;
// } {
//   const closure = new Map<string, Identifier>();
//   const isLocationAssignedMap = new Map<string, boolean>();
//   const bindingsToImport = new Set<Binding>();

//   // this traversal looks for variables to capture
//   traverse(ast, {
//     Identifier(path) {
//       // we only capture variables that were declared outside of the scope
//       if (!path.isReferencedIdentifier()) {
//         return;
//       }
//       const name = path.node.name;
//       // if the function is named and was added to globals we don't want to add it to closure
//       // hence we check if identifier has that name
//       if (globals.has(name)) {
//         return;
//       }

//       const binding = fun.scope.getBinding(name);
//       if (binding) {
//         if (
//           binding.kind === 'module' &&
//           binding.constant &&
//           binding.path.isImportSpecifier() &&
//           binding.path.parentPath.isImportDeclaration() &&
//           state.opts.workletModules?.some((module) =>
//             (
//               binding.path.parentPath as NodePath<ImportDeclaration>
//             ).node.source.value.includes(module)
//           )
//         ) {
//           bindingsToImport.add(binding);
//           return;
//         }
//       }

//       if (
//         'id' in fun.node &&
//         fun.node.id &&
//         fun.node.id.name === name // we don't want to capture function's own name
//       ) {
//         return;
//       }

//       const parentNode = path.parent;

//       if (
//         isMemberExpression(parentNode) &&
//         parentNode.property === path.node &&
//         !parentNode.computed
//       ) {
//         return;
//       }

//       if (
//         isObjectProperty(parentNode) &&
//         isObjectExpression(path.parentPath.parent) &&
//         path.node !== parentNode.value
//       ) {
//         return;
//       }

//       let currentScope = path.scope;

//       while (currentScope != null) {
//         if (currentScope.bindings[name] != null) {
//           return;
//         }
//         currentScope = currentScope.parent;
//       }
//       closure.set(name, cloneNode(path.node, true));
//       isLocationAssignedMap.set(name, false);
//     },
//   });

//   /*
//   For reasons I don't exactly understand, the above traversal will cause the whole
//   bundle to crash if we traversed original node instead of generated
//   AST. This is why we need to traverse it again, but this time we set
//   location for each identifier that was captured to their original counterpart, since
//   AST has its location set relative as if it was a separate file.
//   */
//   fun.traverse({
//     Identifier(path) {
//       // So it won't refer to something like:
//       // const obj = {unexistingVariable: 1};
//       if (!path.isReferencedIdentifier()) {
//         return;
//       }
//       const node = closure.get(path.node.name);
//       if (!node || isLocationAssignedMap.get(path.node.name)) {
//         return;
//       }
//       node.loc = path.node.loc;
//       isLocationAssignedMap.set(path.node.name, true);
//     },
//   });

//   return { closureVariables: Array.from(closure.values()), bindingsToImport };
// }

function getClosure(
  fun: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): {
  closureVariables: Identifier[];
  libraryBindingsToImport: Set<Binding>;
  relativeBindingsToImport: Set<Binding>;
} {
  const closureVariables = new Set<string>();
  const libraryBindingsToImport = new Set<Binding>();
  const relativeBindingsToImport = new Set<Binding>();
  fun.traverse(
    {
      Identifier(path) {
        const name = path.node.name;
        if (!path.isReferencedIdentifier() || path.key === 'typeName') {
          return;
        }

        if ('id' in fun.node && fun.node.id && fun.node.id.name === name) {
          return;
        }
        if (fun.scope.hasOwnBinding(path.node.name)) {
          return;
        }
        if (path.scope.hasOwnBinding(path.node.name)) {
          return;
        }
        const binding = fun.scope.getBinding(path.node.name);
        if (binding) {
          if (
            binding.kind === 'module' &&
            binding.constant &&
            binding.path.isImportSpecifier() &&
            binding.path.parentPath.isImportDeclaration() &&
            state.opts.workletModules?.some(
              (module) =>
                (
                  binding.path.parentPath as NodePath<ImportDeclaration>
                ).node.source.value.includes(module)
              // ||
              // (state.filename!.includes(module) &&
              //   (
              //     binding.path.parentPath as NodePath<ImportDeclaration>
              //   ).node.source.value.startsWith('.'))
            )
          ) {
            console.log(
              'library binding',
              name,
              'id' in fun.node && fun.node.id?.name
            );
            libraryBindingsToImport.add(binding);
          } else if (
            binding.kind === 'module' &&
            binding.constant &&
            binding.path.isImportSpecifier() &&
            binding.path.parentPath.isImportDeclaration() &&
            state.opts.workletModules?.some(
              (module) =>
                state.filename!.includes(module) &&
                (
                  binding.path.parentPath as NodePath<ImportDeclaration>
                ).node.source.value.startsWith('.')
            ) // relative import
          ) {
            console.log('binding', name, 'id' in fun.node && fun.node.id?.name);
            relativeBindingsToImport.add(binding);
          } else {
            // console.log('closure', name);
            if (globals.has(name)) {
              return;
            }
            closureVariables.add(name);
          }
        }
      },
    },
    state
  );

  const retClosureVariables = Array.from(closureVariables).map((name) =>
    identifier(name)
  );

  return {
    closureVariables: retClosureVariables,
    libraryBindingsToImport,
    relativeBindingsToImport,
  };
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
