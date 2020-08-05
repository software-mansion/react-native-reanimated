'use strict';

const generate = require('@babel/generator').default;
const hash = require('string-hash-64');
const { visitors } = require('@babel/traverse');
const traverse = require('@babel/traverse').default;
const parse = require('@babel/parser').parse;

const functionHooks = new Set([
  'useAnimatedStyle',
  'useAnimatedProps',
  'useDerivedValue',
  'useAnimatedScrollHandler',
]);

const objectHooks = new Set([
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
]);

const globals = new Set([
  'this',
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
  'undefined',
  'null',
  'UIManager',
  'requestAnimationFrame',
  '_WORKLET',
  'arguments',
  '_log',
  '_updateProps',
  'RegExp',
  'Error',
  'global',
  '_measure',
  '_scrollTo',
]);

function buildWorkletString(t, fun, closureVariables, name) {
  fun.traverse({
    enter(path) {
      t.removeComments(path.node);
    },
  });

  let workletFunction;
  if (closureVariables.length > 0) {
    workletFunction = t.functionExpression(
      t.identifier(name),
      fun.node.params,
      t.blockStatement([
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
        fun.get('body').node,
      ])
    );
  } else {
    workletFunction = t.functionExpression(
      t.identifier(name),
      fun.node.params,
      fun.get('body').node
    );
  }

  return generate(workletFunction, { compact: true }).code;
}

function processWorkletFunction(t, fun) {
  if (!t.isFunctionParent(fun)) {
    return;
  }

  let functionName = '_f';

  if (fun.node.id) {
    functionName = fun.node.id.name;
  }

  const closure = new Map();
  const outputs = new Set();

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
        parentNode.object !== path.node
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
          t.objectExpression(
            variables.map((variable) =>
              t.objectProperty(
                t.identifier(variable.name),
                variable,
                false,
                true
              )
            )
          )
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

function processIfWorkletNode(t, path) {
  const fun = path;

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
          processWorkletFunction(t, fun);
        }
      }
    },
  });
}

function processWorklets(t, path, processor) {
  const name = path.node.callee.name;
  if (
    objectHooks.has(name) &&
    path.get('arguments.0').type === 'ObjectExpression'
  ) {
    const objectPath = path.get('arguments.0.properties.0');
    for (let i = 0; i < objectPath.container.length; i++) {
      processor(t, objectPath.getSibling(i).get('value'));
    }
  } else if (functionHooks.has(name)) {
    processor(t, path.get('arguments.0'));
  }
}

const PLUGIN_BLACKLIST_NAMES = [
  '@babel/plugin-transform-object-assign',
];

const PLUGIN_BLACKLIST = PLUGIN_BLACKLIST_NAMES.map((pluginName) => {
  try {
    const blacklistedPluginObject = require(pluginName);
    // All Babel polyfills use the declare method that's why we can create them like that.
    // https://github.com/babel/babel/blob/main/packages/babel-helper-plugin-utils/src/index.js#L1
    const blacklistedPlugin = blacklistedPluginObject.default({
      assertVersion: (x) => true,
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
        JSON.stringify(Object.keys(plugins[i].visitor)) !=
        JSON.stringify(Object.keys(blacklistedPlugin.visitor))
      ) {
        continue;
      }
      let areEqual = true;
      for (const key of Object.keys(blacklistedPlugin.visitor)) {
        if (
          blacklistedPlugin.visitor[key].toString() !=
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

module.exports = function ({ types: t }) {
  return {
    visitor: {
      CallExpression: {
        exit(path) {
          processWorklets(t, path, processWorkletFunction);
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
        exit(path) {
          processIfWorkletNode(t, path);
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
