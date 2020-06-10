'use strict';

const generate = require('@babel/generator').default;

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
]);

function buildWorkletString(t, fun, closureVariables) {
  fun.traverse({
    enter(path) {
      t.removeComments(path.node);
    },
  });

  let workletFunction;
  if (closureVariables.length > 0) {
    workletFunction = t.functionExpression(
      null,
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
            t.memberExpression(t.thisExpression(), t.identifier('_closure'))
          ),
        ]),
        fun.get('body').node,
      ])
    );
  } else {
    workletFunction = t.functionExpression(
      null,
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

  const closure = new Map();
  const outputs = new Set();

  const funScope = fun.scope;

  fun.traverse({
    DirectiveLiteral(path) {
      if (path.node.value === 'worklet' && path.getFunctionParent() === fun) {
        path.parentPath.remove();
      }
    },
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

      while (true) {
        if (currentScope.bindings[name] != null) {
          return;
        }
        if (currentScope === funScope) {
          break;
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
  const variables = Array.from(closure.values());

  const privateFunctionId = t.identifier('_f');

  // if we don't clone other modules won't process parts of newFun defined below
  // this is weird but couldn't find a better way to force transform helper to
  // process the function
  const workletID = Math.random() * 1e18;
  const clone = t.cloneNode(fun.node);
  const funExpression = t.functionExpression(null, clone.params, clone.body);

  const funString = buildWorkletString(t, fun, variables);

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
            t.identifier('__workletID'),
            false
          ),
          t.numericLiteral(workletID)
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

function removeWorkletLabelFromSubtrees(path) {
  const parentFunction = path.getFunctionParent();
  if (parentFunction != null) {
    parentFunction.traverse({
      Directive(innerPath) {
        if (
          innerPath.node.value != path.node &&
          innerPath.node.value.value === 'worklet'
        ) {
          innerPath.remove();
        }
      },
    });
  }
}

module.exports = function ({ types: t }) {
  return {
    visitor: {
      CallExpression: {
        enter(path) {
          if (path.get('callee').matchesPattern('Object.assign')) {
            // @babel/plugin-transform-object-assign
            path.node.callee.object.name = 'random_temp_name';
          }
        },
        exit(path) {
          if (path.get('callee').matchesPattern('random_temp_name.assign')) {
            // @babel/plugin-transform-object-assign
            path.node.callee.object.name = 'Object';
          }

          processWorklets(t, path, processWorkletFunction);
        },
      },
      FunctionDeclaration: {
        exit(path) {
          processIfWorkletNode(t, path);
        },
      },
      FunctionExpression: {
        exit(path) {
          processIfWorkletNode(t, path);
        },
      },
      ArrowFunctionExpression: {
        exit(path) {
          processIfWorkletNode(t, path);
        },
      },
      DirectiveLiteral: {
        enter(path) {
          if (path.node.value === 'worklet') {
            removeWorkletLabelFromSubtrees(path);
          }
        },
      },
    },
  };
};
