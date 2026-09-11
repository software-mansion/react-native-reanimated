import type { BabelFileResult, NodePath, PluginItem } from '@babel/core';
import { traverse } from '@babel/core';
import generate from '@babel/generator';
import type {
  Expression,
  File as BabelFile,
  Identifier,
  LVal,
  RestElement,
  Statement,
  VariableDeclaration,
} from '@babel/types';
import {
  assertBlockStatement,
  binaryExpression,
  callExpression,
  cloneNode,
  conditionalExpression,
  functionExpression,
  getBindingIdentifiers,
  identifier,
  isArrowFunctionExpression,
  isAssignmentPattern,
  isBlockStatement,
  isCallExpression,
  isExpression,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isObjectMethod,
  isProgram,
  isRestElement,
  isVariableDeclaration,
  memberExpression,
  numericLiteral,
  objectPattern,
  objectProperty,
  thisExpression,
  unaryExpression,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import * as convertSourceMap from 'convert-source-map';
import * as fs from 'fs';

import { workletTransformSync } from './transform';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';
import { workletClassFactorySuffix } from './types';
import { isRelease } from './utils';

const MOCK_SOURCE_MAP = 'mock source map';
const querySuffixRE = /[?#].*$/;

export function buildWorkletString(
  fun: BabelFile,
  state: WorkletsPluginPass,
  closureVariables: Array<Identifier>,
  workletName: string,
  inputMap: BabelFileResult['map']
): Array<string | null | undefined> {
  restoreRecursiveCalls(fun, workletName);

  const draftExpression =
    fun.program.body.find((obj) => isFunctionDeclaration(obj)) ||
    fun.program.body.find((obj) => isExpressionStatement(obj));

  assert(draftExpression, '`draftExpression` is undefined.');

  const expression = isFunctionDeclaration(draftExpression)
    ? draftExpression
    : draftExpression.expression;

  assert(
    'params' in expression,
    "'params' property is undefined in 'expression'"
  );
  assert(
    isBlockStatement(expression.body),
    '`expression.body` is not a `BlockStatement`'
  );

  const parsedClasses = new Set<string>();

  if (!state.opts.disableWorkletClasses) {
    traverse(fun, {
      NewExpression(path) {
        if (!isIdentifier(path.node.callee)) {
          return;
        }
        const constructorName = path.node.callee.name;
        if (
          !closureVariables.some(
            (variable) => variable.name === constructorName
          ) ||
          parsedClasses.has(constructorName)
        ) {
          return;
        }
        const index = closureVariables.findIndex(
          (variable) => variable.name === constructorName
        );
        closureVariables.splice(index, 1);
        const workletClassFactoryName =
          constructorName + workletClassFactorySuffix;
        closureVariables.push(identifier(workletClassFactoryName));

        assertBlockStatement(expression.body);
        expression.body.body.unshift(
          variableDeclaration('const', [
            variableDeclarator(
              identifier(constructorName),
              callExpression(identifier(workletClassFactoryName), [])
            ),
          ])
        );
        parsedClasses.add(constructorName);
      },
    });
  }

  const workletFunction = functionExpression(
    identifier(workletName),
    expression.params,
    expression.body,
    expression.generator,
    expression.async
  );

  traverse(fun, {
    Directive(path) {
      path.remove();
    },
  });

  const code = generate(workletFunction).code;

  assert(inputMap, '`inputMap` is undefined.');

  const includeSourceMap = !(isRelease(state) || state.opts.disableSourceMaps);

  if (includeSourceMap) {
    // Clear contents array (should be empty anyways)
    inputMap.sourcesContent = [];
    // Include source contents in source map, because Flipper/iframe is not
    // allowed to read files from disk.
    for (const sourceFile of inputMap.sources) {
      inputMap.sourcesContent.push(
        fs.readFileSync(sourceFile.replace(querySuffixRE, '')).toString('utf-8')
      );
    }
  }

  const transformed = workletTransformSync(code, {
    filename: state.file.opts.filename,
    extraPlugins: [
      getClosurePlugin(closureVariables, parsedClasses),
      ...(state.opts.extraPlugins ?? []),
    ],
    extraPresets: state.opts.extraPresets,
    compact: true,
    sourceMaps: includeSourceMap,
    inputSourceMap: inputMap,
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  });

  assert(transformed, '`transformed` is null.');

  let sourceMap;
  if (includeSourceMap) {
    if (shouldMockSourceMap()) {
      sourceMap = MOCK_SOURCE_MAP;
    } else {
      sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
      // sourcesContent field contains a full source code of the file which contains the worklet
      // and is not needed by the source map interpreter in order to symbolicate a stack trace.
      // Therefore, we remove it to reduce the bandwith and avoid sending it potentially multiple times
      // in files that contain multiple worklets. Along with sourcesContent.
      delete sourceMap.sourcesContent;
    }
  }

  const wrappedCode = `(${transformed.code})`;

  return [wrappedCode, JSON.stringify(sourceMap)];
}

/**
 * Function that restores recursive calls after the name of the worklet has
 * changed.
 */
function restoreRecursiveCalls(file: BabelFile, newName: string): void {
  traverse(file, {
    FunctionExpression(path) {
      if (!path.node.id) {
        // Function wasn't named, hence it couldn't have had recursive calls by its name.
        path.stop();
        return;
      }
      const oldName = path.node.id.name;
      const scope = path.scope;
      scope.rename(oldName, newName);
    },
  });
}

function shouldMockSourceMap() {
  // We don't want to pollute tests with source maps so we mock it
  // for all tests (except one)
  return process.env.WORKLETS_JEST_SHOULD_MOCK_SOURCE_MAP === '1';
}

/**
 * Names a worklet's BODY resolves and its parameter scope cannot.
 *
 * The closure destructure is the bulk of it. The recursion binding is the
 * other: `prependRecursiveDeclaration` shadows a self-referencing worklet's own
 * name with `const <name> = this._recur;` inside the body, so a default that
 * CALLS the worklet resolves, from parameter scope, to the bare function
 * expression and invokes it with no `this` — and `this.__closure` is the first
 * thing its body reads.
 *
 * The function's own name is added whenever it has one, rather than replicating
 * `prependRecursiveDeclaration`'s emit condition. Where that declaration is not
 * emitted the two scopes resolve the name identically, so hoisting is a no-op
 * there; replicating the condition would only add a second place for the two to
 * disagree.
 */
function collectBodyScopeNames(
  path: NodePath<WorkletizableFunction>,
  closureVariables: Array<Identifier>,
  workletClassNames: ReadonlySet<string>
): Set<string> {
  const names = new Set(closureVariables.map((variable) => variable.name));

  // A captured worklet CLASS is not in `closureVariables` under its own name.
  // `buildWorkletString` replaces `Foo` with `Foo<suffix>` there and prepends
  // `const Foo = Foo<suffix>();` to the body — so the constructor name is
  // body-scoped exactly like a capture, and a default such as `new Foo()`
  // reads it from parameter scope. Leaving it out keeps that shape as the
  // original defect at a new trigger.
  //
  // The names come from the census `buildWorkletString` kept while rewriting
  // rather than from stripping the suffix off a closure entry. The suffix is a
  // plain string a user may also have typed, so stripping it would declare a
  // body-scoped `x` for a captured variable named `x__classFactory` that no
  // declaration ever creates — and hoist a parameter that had no reason to
  // move.
  for (const className of workletClassNames) {
    names.add(className);
  }

  // An arrow function and an object method carry no name of their own, so
  // `prependRecursiveDeclaration` has nothing to shadow in either.
  if (
    !isArrowFunctionExpression(path.node) &&
    !isObjectMethod(path.node) &&
    path.node.id
  ) {
    names.add(path.node.id.name);
  }

  return names;
}

/**
 * Names the body declares var-scoped.
 *
 * `var x` may legally redeclare a parameter and may NOT redeclare a `let`, so
 * hoisting such a parameter would emit `let x; var x;` — a SyntaxError that
 * fails on every call rather than only the defaulting one.
 */
function collectBodyRedeclarations(
  path: NodePath<WorkletizableFunction>
): Set<string> {
  const names = new Set<string>();
  const bodyPath = path.get('body');

  if (!bodyPath.isBlockStatement()) {
    return names;
  }

  bodyPath.traverse({
    Function(innerPath) {
      // A function DECLARATION is var-scoped, so `let x; function x() {}` is the
      // same SyntaxError. A function EXPRESSION's name binds only inside itself
      // and redeclares nothing — `let x = 1; const f = function x() {};` is
      // legal, so counting it here would refuse a hoist that is needed and
      // silently keep the crash this exists to remove.
      if (innerPath.isFunctionDeclaration() && innerPath.node.id) {
        names.add(innerPath.node.id.name);
      }
      innerPath.skip();
    },
    VariableDeclaration(innerPath) {
      if (innerPath.node.kind !== 'var') {
        return;
      }
      for (const declaration of innerPath.node.declarations) {
        for (const boundName of Object.keys(
          getBindingIdentifiers(declaration.id)
        )) {
          names.add(boundName);
        }
      }
    },
  });

  return names;
}

/**
 * Why a parameter cannot stay where it was written. Either reason is sufficient
 * on its own, and the second is a consequence of the first.
 *
 * `body-scope` — the parameter reads a name the body declares, so it sits one
 * scope away from the binding it needs and throws the first time it evaluates.
 *
 * `evaluation-order` — the parameter reads nothing body-scoped, but an EARLIER
 * parameter has moved. Parameter expressions evaluate left to right and all of
 * them before the body, so a parameter left behind would now run BEFORE the one
 * that used to precede it. No value changes; the ORDER of their side effects
 * does, which is a silent reordering of what the source says.
 */
type ParameterHoistReason = 'body-scope' | 'evaluation-order';

/**
 * One entry of a parameter list, derived from the functions this plugin
 * rewrites.
 */
type WorkletParameterPath = NodePath<WorkletizableFunction['params'][number]>;

/** One parameter the plan moves into the body, and everything the move needs. */
interface HoistedParameter {
  readonly boundNames: Array<string>;
  /** Present iff the parameter carried a default, which becomes a conditional. */
  readonly defaultValue: Expression | undefined;
  readonly index: number;
  readonly pattern: LVal;
  /** Why this parameter cannot stay in the parameter scope. */
  readonly reason: ParameterHoistReason;
  /**
   * Set iff the parameter is `...[a = CAPTURED]`. The placeholder then replaces
   * the rest ARGUMENT rather than the parameter, because the rest element
   * itself has to go on collecting the remaining arguments.
   */
  readonly restElementNode: RestElement | undefined;
}

/** The half of a `HoistedParameter` that the parameter's own shape decides. */
type ParameterScopeExpression = Pick<
  HoistedParameter,
  'defaultValue' | 'pattern' | 'restElementNode'
>;

/**
 * What this parameter evaluates in the PARAMETER scope, or `undefined` where it
 * evaluates nothing there and so can neither fail nor be observed.
 *
 * An identifier binds no expression and a void pattern binds nothing at all;
 * `...rest` binds a plain identifier and cannot carry a default. Every other
 * shape runs something at call time — a default expression, or the
 * destructuring itself, which reads properties and drives the iterator
 * protocol.
 */
function resolveParameterScopeExpression(
  parameterPath: WorkletParameterPath
): ParameterScopeExpression | undefined {
  const parameter = parameterPath.node;

  // `VoidPattern` is compared by node TYPE rather than through
  // `isVoidPattern`, which is a recent `@babel/types` export. This plugin
  // requires that package at runtime without declaring a range for it, so a
  // consumer resolving an older copy would get `isVoidPattern is not a
  // function` and every worklet in the app would fail to compile. A type
  // comparison needs nothing the package has not always had.
  if (isIdentifier(parameter) || parameter.type === 'VoidPattern') {
    return undefined;
  }

  const restElementNode = isRestElement(parameter) ? parameter : undefined;
  const target = restElementNode ? restElementNode.argument : parameter;

  if (restElementNode && isIdentifier(target)) {
    return undefined;
  }

  return {
    defaultValue: isAssignmentPattern(target) ? target.right : undefined,
    pattern: isAssignmentPattern(target) ? target.left : target,
    restElementNode,
  };
}

/**
 * Whether anything this parameter evaluates reads a name that lives in the
 * body.
 */
function readsBodyScopedName(
  parameterPath: WorkletParameterPath,
  bodyScopeNames: ReadonlySet<string>
): boolean {
  let reads = false;

  parameterPath.traverse({
    Identifier(innerPath) {
      if (
        bodyScopeNames.has(innerPath.node.name) &&
        innerPath.isReferencedIdentifier()
      ) {
        reads = true;
      }
    },
  });

  return reads;
}

/** Pure: the two independent reasons, in the order they are reported. */
function resolveHoistReason(
  readsBodyScope: boolean,
  followsHoistedParameter: boolean
): ParameterHoistReason | undefined {
  if (readsBodyScope) {
    return 'body-scope';
  }

  if (followsHoistedParameter) {
    return 'evaluation-order';
  }

  return undefined;
}

/**
 * WHICH parameters must move, decided over the WHOLE list before any of them
 * does.
 *
 * The set needs a fixed point because it grows two ways and each feeds the
 * other. Hoisting a parameter moves its bindings into the body, so a parameter
 * that READS one of them is newly unable to stay; and hoisting a parameter puts
 * every LATER one that evaluates anything on the wrong side of it. Deciding
 * per-parameter while mutating means parameter N commits before N+1 reveals
 * that it cannot follow, and a parameter left behind reading a name that
 * already moved is the original defect at a new trigger — on a call that
 * previously worked.
 */
function planHoistedParameters(
  path: NodePath<WorkletizableFunction>,
  bodyScopeNames: Set<string>
): Array<HoistedParameter> {
  const names = new Set(bodyScopeNames);
  const planned = new Map<number, HoistedParameter>();
  const parameterPaths = path.get('params');
  let lowestPlannedIndex = Number.POSITIVE_INFINITY;
  let changed = true;

  while (changed) {
    changed = false;
    parameterPaths.forEach((parameterPath, index) => {
      if (planned.has(index)) {
        return;
      }

      const scopeExpression = resolveParameterScopeExpression(parameterPath);

      if (scopeExpression === undefined) {
        return;
      }

      const reason = resolveHoistReason(
        readsBodyScopedName(parameterPath, names),
        index > lowestPlannedIndex
      );

      if (reason === undefined) {
        return;
      }

      const boundNames = Object.keys(
        getBindingIdentifiers(scopeExpression.pattern)
      );

      planned.set(index, { ...scopeExpression, boundNames, index, reason });
      lowestPlannedIndex = Math.min(lowestPlannedIndex, index);

      for (const boundName of boundNames) {
        names.add(boundName);
      }

      changed = true;
    });
  }

  return Array.from(planned.values()).sort(
    (left, right) => left.index - right.index
  );
}

/**
 * Move every parameter that reads a body-scoped binding into the body itself.
 *
 * A worklet's captured variables are destructured at the top of the BODY, but a
 * parameter expression — a default value, a destructuring default — is
 * evaluated in the PARAMETER scope, which by specification cannot see a body
 * declaration. Such a parameter is therefore emitted exactly one scope away
 * from the binding it needs, and throws `ReferenceError` the first time a
 * caller omits that argument. On the UI thread that is an uncaught C++
 * exception rather than a catchable error.
 *
 * A parameter that depends on nothing body-scoped is left exactly as written —
 * including a default that reads an EARLIER parameter, which parameter scope
 * can legitimately see.
 */
function hoistBodyScopedParameters(
  path: NodePath<WorkletizableFunction>,
  closureVariables: Array<Identifier>,
  workletClassNames: ReadonlySet<string>
): Array<VariableDeclaration> {
  const bodyScopeNames = collectBodyScopeNames(
    path,
    closureVariables,
    workletClassNames
  );
  const hoisted: Array<VariableDeclaration> = [];

  if (bodyScopeNames.size === 0) {
    return hoisted;
  }

  const plan = planHoistedParameters(path, bodyScopeNames);

  if (plan.length === 0) {
    return hoisted;
  }

  // ALL OR NOTHING. A parameter the body redeclares with `var` cannot become a
  // `let`, and the rest of the plan depends on it having moved — so hoisting the
  // others would leave one of them reading a name that is no longer in parameter
  // scope. Emitting nothing reproduces upstream's output exactly, which keeps
  // upstream's defect and adds none of its own: the floor for this function is
  // "no worse than unpatched", never "broken differently".
  const bodyRedeclarations = collectBodyRedeclarations(path);
  const blocked = plan.some((entry) =>
    entry.boundNames.some((name) => bodyRedeclarations.has(name))
  );

  if (blocked) {
    return hoisted;
  }

  for (const entry of plan) {
    // A generated uid rather than a raw identifier: a raw name collides when the
    // body already declares it, or when a second hoisted parameter takes the
    // same one. `generateUid` is what resolves both, by re-suffixing until the
    // name is free in the whole program.
    //
    // The requested name carries no index, because it could not keep one:
    // `Scope#generateUid` strips trailing digits from its argument before doing
    // anything else. An index here would be discarded and the digits that DO
    // appear are the collision counter, so the two disagree — parameter 9 emits
    // `_workletParameter0`. A name that looks traceable and is not is worse than
    // one that never claimed to be.
    const placeholder = path.scope.generateUidIdentifier(
      entry.restElementNode ? 'restPattern' : 'workletParameter'
    );
    let initializer: Expression = placeholder;

    if (entry.defaultValue) {
      // ES default semantics treat an explicitly-passed `undefined` exactly as
      // an omitted argument, so the identity check IS the rewrite — against
      // `void 0`, never a shadowable `undefined`.
      initializer = conditionalExpression(
        binaryExpression(
          '===',
          cloneNode(placeholder),
          unaryExpression('void', numericLiteral(0))
        ),
        entry.defaultValue,
        cloneNode(placeholder)
      );
    }

    if (entry.restElementNode) {
      entry.restElementNode.argument = placeholder;
    } else {
      path.node.params[entry.index] = placeholder;
    }

    hoisted.push(
      variableDeclaration('let', [
        variableDeclarator(entry.pattern, initializer),
      ])
    );
  }

  return hoisted;
}

function prependClosure(
  path: NodePath<WorkletizableFunction>,
  closureVariables: Array<Identifier>,
  workletClassNames: ReadonlySet<string>,
  closureDeclaration: VariableDeclaration
) {
  if (!isProgram(path.parent) || isExpression(path.node.body)) {
    return;
  }

  // The hoist runs whether or not anything was captured.
  // `prependRecursiveDeclaration` shadows a self-referencing worklet's own name
  // in the BODY, so a parameter default that reads that name is out of scope of
  // it even when there is no closure to declare — and gating the hoist on the
  // closure count made two otherwise-identical worklets differ by one captured
  // constant.
  //
  // The hoisted declarations follow the closure destructure, because that is the
  // binding they were moved here to reach.
  const hoisted = hoistBodyScopedParameters(
    path,
    closureVariables,
    workletClassNames
  );
  const body = path.node.body.body;

  // …and they follow the worklet-class factory calls for the same reason.
  // `buildWorkletString` has already prepended `const Foo = Foo<suffix>();` for
  // every captured class, so a hoisted initializer that constructs one would
  // read `Foo` in its temporal dead zone if it landed above that declaration.
  body.splice(
    countLeadingClassFactoryDeclarations(body, workletClassNames),
    0,
    ...hoisted
  );

  if (closureVariables.length > 0) {
    body.unshift(closureDeclaration);
  }
}

/**
 * How many worklet-class factory declarations `buildWorkletString` has already
 * placed at the top of the body.
 *
 * A statement counts only when it is `const <name> = <name><suffix>();` for a
 * `<name>` in the census of classes this worklet's rewrite actually produced,
 * and each name counts once — so the answer can never exceed the number of
 * declarations that were generated, and a body carrying none is answered with
 * zero. Matching the SHAPE alone would also count a user statement calling any
 * identifier that happens to end in the suffix, and the hoisted declarations
 * would then land BELOW a body statement whose side effects the source runs
 * after every parameter expression.
 */
function countLeadingClassFactoryDeclarations(
  body: ReadonlyArray<Statement>,
  workletClassNames: ReadonlySet<string>
): number {
  const remaining = new Set(workletClassNames);
  let count = 0;

  while (count < body.length && remaining.size > 0) {
    const statement = body[count];

    if (
      !isVariableDeclaration(statement) ||
      statement.kind !== 'const' ||
      statement.declarations.length !== 1
    ) {
      break;
    }

    const [declarator] = statement.declarations;
    const initializer = declarator.init;

    if (
      !isIdentifier(declarator.id) ||
      !remaining.has(declarator.id.name) ||
      !isCallExpression(initializer) ||
      initializer.arguments.length > 0 ||
      !isIdentifier(initializer.callee) ||
      initializer.callee.name !== declarator.id.name + workletClassFactorySuffix
    ) {
      break;
    }

    remaining.delete(declarator.id.name);
    count += 1;
  }

  return count;
}

function prependRecursiveDeclaration(path: NodePath<WorkletizableFunction>) {
  if (
    isProgram(path.parent) &&
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

/** Prepends necessary closure variables to the worklet function. */
function getClosurePlugin(
  closureVariables: Array<Identifier>,
  workletClassNames: ReadonlySet<string>
): PluginItem {
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
      memberExpression(thisExpression(), identifier('__closure'))
    ),
  ]);

  return {
    visitor: {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod':
        (path: NodePath<WorkletizableFunction>) => {
          prependClosure(
            path,
            closureVariables,
            workletClassNames,
            closureDeclaration
          );
          prependRecursiveDeclaration(path);
        },
    },
  };
}
