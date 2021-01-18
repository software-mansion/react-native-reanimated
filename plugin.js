'use strict';

const generate = require('@babel/generator').default;
const hash = require('string-hash-64');
const { visitors } = require('@babel/traverse');
const traverse = require('@babel/traverse').default;
const parse = require('@babel/parser').parse;

/**
 * holds a map of function names as keys and array of argument indexes as values which should be automatically workletized(they have to be functions)(starting from 0)
 */
const functionArgsToWorkletize = new Map([
  ['useAnimatedStyle', [0]],
  ['useAnimatedProps', [0]],
  ['createAnimatedPropAdapter', [0]],
  ['useDerivedValue', [0]],
  ['useAnimatedScrollHandler', [0]],
  ['useAnimatedReaction', [0, 1]],
  ['useWorkletCallback', [0]],
  ['createWorklet', [0]],
  // animations' callbacks
  ['withTiming', [2]],
  ['withSpring', [2]],
  ['withDecay', [1]],
  ['withRepeat', [3]],
]);

const objectHooks = new Set([
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
]);

const globals = new Set([
  'this',
  'console',
  '_setGlobalConsole',
  'Date',
  'Array',
  'ArrayBuffer',
  'Date',
  'HermesInternal',
  'JSON',
  'Math',
  'Number',
  'Object',
  'String',
  'Symbol',
  'undefined',
  'null',
  'UIManager',
  'requestAnimationFrame',
  '_WORKLET',
  'arguments',
  'Boolean',
  'parseInt',
  'parseFloat',
  'Map',
  'Set',
  '_log',
  '_updateProps',
  'RegExp',
  'Error',
  'global',
  '_measure',
  '_scrollTo',
  '_getCurrentTime',
  '_eventTimestamp',
  '_frameTimestamp',
  'isNaN',
]);

// leaving way to avoid deep capturing by adding 'stopCapturing' to the blacklist
const blacklistedFunctions = new Set([
  'stopCapturing',
  'toString',
  'map',
  'filter',
  'forEach',
  'valueOf',
  'toPrecision',
  'toExponential',
  'constructor',
  'toFixed',
  'toLocaleString',
  'toSource',
  'charAt',
  'charCodeAt',
  'concat',
  'indexOf',
  'lastIndexOf',
  'localeCompare',
  'length',
  'match',
  'replace',
  'search',
  'slice',
  'split',
  'substr',
  'substring',
  'toLocaleLowerCase',
  'toLocaleUpperCase',
  'toLowerCase',
  'toUpperCase',
  'every',
  'join',
  'pop',
  'push',
  'reduce',
  'reduceRight',
  'reverse',
  'shift',
  'slice',
  'some',
  'sort',
  'splice',
  'unshift',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'bind',
  'apply',
  'call',
  '__callAsync',
]);

class ClosureGenerator {
  constructor() {
    this.trie = [{}, false];
  }

  mergeAns(oldAns, newAns) {
    const [purePath, node] = oldAns;
    const [purePathUp, nodeUp] = newAns;
    if (purePathUp.length !== 0) {
      return [purePath.concat(purePathUp), nodeUp];
    } else {
      return [purePath, node];
    }
  }

  findPrefixRec(path) {
    const notFound = [[], null];
    if (!path || path.node.type !== 'MemberExpression') {
      return notFound;
    }
    const memberExpressionNode = path.node;
    if (memberExpressionNode.property.type !== 'Identifier') {
      return notFound;
    }
    if (
      memberExpressionNode.computed ||
      memberExpressionNode.property.name === 'value' ||
      blacklistedFunctions.has(memberExpressionNode.property.name)
    ) {
      // a.b[w] -> a.b.w in babel nodes
      // a.v.value
      // sth.map(() => )
      return notFound;
    }
    if (
      path.parent &&
      path.parent.type === 'AssignmentExpression' &&
      path.parent.left === path.node
    ) {
      /// captured.newProp = 5;
      return notFound;
    }
    const purePath = [memberExpressionNode.property.name];
    const node = memberExpressionNode;
    const upAns = this.findPrefixRec(path.parentPath);
    return this.mergeAns([purePath, node], upAns);
  }

  findPrefix(base, babelPath) {
    const purePath = [base];
    const node = babelPath.node;
    const upAns = this.findPrefixRec(babelPath.parentPath);
    return this.mergeAns([purePath, node], upAns);
  }

  addPath(base, babelPath) {
    const [purePath, node] = this.findPrefix(base, babelPath);
    let parent = this.trie;
    let index = -1;
    for (const current of purePath) {
      index++;
      if (parent[1]) {
        continue;
      }
      if (!parent[0][current]) {
        parent[0][current] = [{}, false];
      }
      if (index === purePath.length - 1) {
        parent[0][current] = [node, true];
      }
      parent = parent[0][current];
    }
  }

  generateNodeForBase(t, current, parent) {
    const currentNode = parent[0][current];
    if (currentNode[1]) {
      return currentNode[0];
    }
    return t.objectExpression(
      Object.keys(currentNode[0]).map((propertyName) =>
        t.objectProperty(
          t.identifier(propertyName),
          this.generateNodeForBase(t, propertyName, currentNode),
          false,
          true
        )
      )
    );
  }

  generate(t, variables, names) {
    const arrayOfKeys = [...names];
    return t.objectExpression(
      variables.map((variable, index) =>
        t.objectProperty(
          t.identifier(variable.name),
          this.generateNodeForBase(t, arrayOfKeys[index], this.trie),
          false,
          true
        )
      )
    );
  }
}

function buildWorkletString(t, fun, closureVariables, name) {
  function prependClosureVariablesIfNecessary(closureVariables, body) {
    if (closureVariables.length === 0) {
      return body;
    }

    return t.blockStatement([
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.objectPattern(
            closureVariables.map((variable) =>
              t.objectProperty(
                t.identifier(variable.name),
                t.identifier(variable.name),
                false,
                true
              )
            )
          ),
          t.memberExpression(t.identifier('jsThis'), t.identifier('_closure'))
        ),
      ]),
      body,
    ]);
  }

  fun.traverse({
    enter(path) {
      t.removeComments(path.node);
    },
  });

  const workletFunction = t.functionExpression(
    t.identifier(name),
    fun.node.params,
    prependClosureVariablesIfNecessary(closureVariables, fun.get('body').node)
  );

  return generate(workletFunction, { compact: true }).code;
}

function processWorkletFunction(t, fun, fileName) {
  if (!t.isFunctionParent(fun)) {
    return;
  }

  const functionName = fun.node.id ? fun.node.id.name : '_f';

  const closure = new Map();
  const outputs = new Set();
  const closureGenerator = new ClosureGenerator();

  // We use copy because some of the plugins don't update bindings and
  // some even break them
  const astWorkletCopy = parse('\n(' + fun.toString() + '\n)');

  traverse(astWorkletCopy, {
    ReferencedIdentifier(path) {
      const name = path.node.name;
      if (globals.has(name) || (fun.node.id && fun.node.id.name === name)) {
        return;
      }

      const parentNode = path.parent;

      if (
        parentNode.type === 'MemberExpression' &&
        (parentNode.property === path.node && !parentNode.computed)
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
      closureGenerator.addPath(name, path);
    },
    AssignmentExpression(path) {
      // test for <somethin>.value = <something> expressions
      const left = path.node.left;
      if (
        t.isMemberExpression(left) &&
        t.isIdentifier(left.object) &&
        t.isIdentifier(left.property, { name: 'value' })
      ) {
        outputs.add(left.object.name);
      }
    },
  });

  fun.traverse({
    DirectiveLiteral(path) {
      if (path.node.value === 'worklet' && path.getFunctionParent() === fun) {
        path.parentPath.remove();
      }
    },
  });
  const variables = Array.from(closure.values());

  const privateFunctionId = t.identifier('_f');

  // if we don't clone other modules won't process parts of newFun defined below
  // this is weird but couldn't find a better way to force transform helper to
  // process the function
  const clone = t.cloneNode(fun.node);
  const funExpression = t.functionExpression(null, clone.params, clone.body);

  const funString = buildWorkletString(t, fun, variables, functionName);
  const workletHash = hash(funString);

  const loc = fun && fun.node && fun.node.loc && fun.node.loc.start;
  if (loc) {
    const { line, column } = loc;
    if (typeof line === 'number' && typeof column === 'number') {
      fileName = `${fileName} (${line}:${column})`;
    }
  }

  const newFun = t.functionExpression(
    fun.id,
    [],
    t.blockStatement([
      t.variableDeclaration('const', [
        t.variableDeclarator(privateFunctionId, funExpression),
      ]),
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(
            privateFunctionId,
            t.identifier('_closure'),
            false
          ),
          closureGenerator.generate(t, variables, closure.keys())
        )
      ),
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(
            privateFunctionId,
            t.identifier('asString'),
            false
          ),
          t.stringLiteral(funString)
        )
      ),
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(
            privateFunctionId,
            t.identifier('__workletHash'),
            false
          ),
          t.numericLiteral(workletHash)
        )
      ),
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(
            privateFunctionId,
            t.identifier('__location'),
            false
          ),
          t.stringLiteral(fileName)
        )
      ),
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(
            t.identifier('global'),
            t.identifier('__reanimatedWorkletInit'),
            false
          ),
          [privateFunctionId]
        )
      ),
      t.returnStatement(privateFunctionId),
    ])
  );

  const replacement = t.callExpression(newFun, []);
  // we check if function needs to be assigned to variable declaration.
  // This is needed if function definition directly in a scope. Some other ways
  // where function definition can be used is for example with variable declaration:
  // const ggg = function foo() { }
  // ^ in such a case we don't need to definte variable for the function
  const needDeclaration =
    t.isScopable(fun.parent) || t.isExportNamedDeclaration(fun.parent);
  fun.replaceWith(
    fun.node.id && needDeclaration
      ? t.variableDeclaration('const', [
          t.variableDeclarator(fun.node.id, replacement),
        ])
      : replacement
  );
}

function processIfWorkletNode(t, fun, fileName) {
  fun.traverse({
    DirectiveLiteral(path) {
      const value = path.node.value;
      if (value === 'worklet' && path.getFunctionParent() === fun) {
        // make sure "worklet" is listed among directives for the fun
        // this is necessary as because of some bug, babel will attempt to
        // process replaced function if it is nested inside another function
        const directives = fun.node.body.directives;
        if (
          directives &&
          directives.length > 0 &&
          directives.some(
            (directive) =>
              t.isDirectiveLiteral(directive.value) &&
              directive.value.value === 'worklet'
          )
        ) {
          processWorkletFunction(t, fun, fileName);
        }
      }
    },
  });
}

function processWorklets(t, path, fileName) {
  const name =
    path.node.callee.type === 'MemberExpression'
      ? path.node.callee.property.name
      : path.node.callee.name;
  if (
    objectHooks.has(name) &&
    path.get('arguments.0').type === 'ObjectExpression'
  ) {
    const objectPath = path.get('arguments.0.properties.0');
    if (!objectPath) {
      // edge case empty object
      return;
    }
    for (let i = 0; i < objectPath.container.length; i++) {
      processWorkletFunction(
        t,
        objectPath.getSibling(i).get('value'),
        fileName
      );
    }
  } else {
    const indexes = functionArgsToWorkletize.get(name);
    if (Array.isArray(indexes)) {
      indexes.forEach((index) => {
        processWorkletFunction(t, path.get(`arguments.${index}`), fileName);
      });
    }
  }
}

const PLUGIN_BLACKLIST_NAMES = ['@babel/plugin-transform-object-assign'];

const PLUGIN_BLACKLIST = PLUGIN_BLACKLIST_NAMES.map((pluginName) => {
  try {
    const blacklistedPluginObject = require(pluginName);
    // All Babel polyfills use the declare method that's why we can create them like that.
    // https://github.com/babel/babel/blob/32279147e6a69411035dd6c43dc819d668c74466/packages/babel-helper-plugin-utils/src/index.js#L1
    const blacklistedPlugin = blacklistedPluginObject.default({
      assertVersion: (_x) => true,
    });

    visitors.explode(blacklistedPlugin.visitor);
    return blacklistedPlugin;
  } catch (e) {
    console.warn(`Plugin ${pluginName} couldn't be removed!`);
  }
});

// plugin objects are created by babel internals and they don't carry any identifier
function removePluginsFromBlacklist(plugins) {
  PLUGIN_BLACKLIST.forEach((blacklistedPlugin) => {
    if (!blacklistedPlugin) {
      return;
    }

    const toRemove = [];
    for (let i = 0; i < plugins.length; i++) {
      if (
        JSON.stringify(Object.keys(plugins[i].visitor)) !==
        JSON.stringify(Object.keys(blacklistedPlugin.visitor))
      ) {
        continue;
      }
      let areEqual = true;
      for (const key of Object.keys(blacklistedPlugin.visitor)) {
        if (
          blacklistedPlugin.visitor[key].toString() !==
          plugins[i].visitor[key].toString()
        ) {
          areEqual = false;
          break;
        }
      }

      if (areEqual) {
        toRemove.push(i);
      }
    }

    toRemove.forEach((x) => plugins.splice(x, 1));
  });
}

module.exports = function({ types: t }) {
  return {
    visitor: {
      CallExpression: {
        exit(path, state) {
          processWorklets(t, path, state.file.opts.filename);
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        exit(path, state) {
          processIfWorkletNode(t, path, state.file.opts.filename);
        },
      },
    },
    // In this way we can modify babel options
    // https://github.com/babel/babel/blob/eea156b2cb8deecfcf82d52aa1b71ba4995c7d68/packages/babel-core/src/transformation/normalize-opts.js#L64
    manipulateOptions(opts, parserOpts) {
      const plugins = opts.plugins;
      removePluginsFromBlacklist(plugins);
    },
  };
};
