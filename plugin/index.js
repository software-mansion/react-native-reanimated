"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/commonObjects.ts
var commonObjects_exports = {};
__export(commonObjects_exports, {
  functionArgsToWorkletize: () => functionArgsToWorkletize,
  gestureHandlerBuilderMethods: () => gestureHandlerBuilderMethods,
  gestureHandlerGestureObjects: () => gestureHandlerGestureObjects,
  globals: () => globals,
  objectHooks: () => objectHooks
});
var functionArgsToWorkletize, objectHooks, globals, gestureHandlerGestureObjects, gestureHandlerBuilderMethods;
var init_commonObjects = __esm({
  "src/commonObjects.ts"() {
    "use strict";
    functionArgsToWorkletize = /* @__PURE__ */ new Map([
      ["useFrameCallback", [0]],
      ["useAnimatedStyle", [0]],
      ["useAnimatedProps", [0]],
      ["createAnimatedPropAdapter", [0]],
      ["useDerivedValue", [0]],
      ["useAnimatedScrollHandler", [0]],
      ["useAnimatedReaction", [0, 1]],
      ["useWorkletCallback", [0]],
      // animations' callbacks
      ["withTiming", [2]],
      ["withSpring", [2]],
      ["withDecay", [1]],
      ["withRepeat", [3]]
    ]);
    objectHooks = /* @__PURE__ */ new Set([
      "useAnimatedGestureHandler",
      "useAnimatedScrollHandler"
    ]);
    globals = /* @__PURE__ */ new Set([
      "this",
      "console",
      "performance",
      "Date",
      "Array",
      "ArrayBuffer",
      "Int8Array",
      "Int16Array",
      "Int32Array",
      "Uint8Array",
      "Uint8ClampedArray",
      "Uint16Array",
      "Uint32Array",
      "Float32Array",
      "Float64Array",
      "HermesInternal",
      "JSON",
      "Math",
      "Number",
      "Object",
      "String",
      "Symbol",
      "undefined",
      "null",
      "UIManager",
      "requestAnimationFrame",
      "setImmediate",
      "_WORKLET",
      "arguments",
      "Boolean",
      "parseInt",
      "parseFloat",
      "Map",
      "WeakMap",
      "WeakRef",
      "Set",
      "_log",
      "_scheduleOnJS",
      "_makeShareableClone",
      "_updateDataSynchronously",
      "eval",
      "_updatePropsPaper",
      "_updatePropsFabric",
      "_removeShadowNodeFromRegistry",
      "RegExp",
      "Error",
      "ErrorUtils",
      "global",
      "_measure",
      "_scrollTo",
      "_dispatchCommand",
      "_setGestureState",
      "_getCurrentTime",
      "isNaN",
      "LayoutAnimationRepository",
      "_notifyAboutProgress",
      "_notifyAboutEnd"
    ]);
    gestureHandlerGestureObjects = /* @__PURE__ */ new Set([
      // from https://github.com/software-mansion/react-native-gesture-handler/blob/new-api/src/handlers/gestures/gestureObjects.ts
      "Tap",
      "Pan",
      "Pinch",
      "Rotation",
      "Fling",
      "LongPress",
      "ForceTouch",
      "Native",
      "Manual",
      "Race",
      "Simultaneous",
      "Exclusive"
    ]);
    gestureHandlerBuilderMethods = /* @__PURE__ */ new Set([
      "onBegin",
      "onStart",
      "onEnd",
      "onFinalize",
      "onUpdate",
      "onChange",
      "onTouchesDown",
      "onTouchesMove",
      "onTouchesUp",
      "onTouchesCancelled"
    ]);
  }
});

// src/commonFunctions.ts
function hash(str) {
  let i = str.length;
  let hash1 = 5381;
  let hash2 = 52711;
  while (i--) {
    const char = str.charCodeAt(i);
    hash1 = hash1 * 33 ^ char;
    hash2 = hash2 * 33 ^ char;
  }
  return (hash1 >>> 0) * 4096 + (hash2 >>> 0);
}
function isRelease() {
  return process.env.BABEL_ENV && ["production", "release"].includes(process.env.BABEL_ENV);
}
function shouldGenerateSourceMap() {
  if (isRelease()) {
    return false;
  }
  if (process.env.REANIMATED_PLUGIN_TESTS === "jest") {
    return false;
  }
  return true;
}
var init_commonFunctions = __esm({
  "src/commonFunctions.ts"() {
    "use strict";
  }
});

// src/makeWorklet.ts
function buildWorkletString(t, fun, closureVariables, name, inputMap) {
  function prependClosureVariablesIfNecessary() {
    const closureDeclaration = t.variableDeclaration("const", [
      t.variableDeclarator(
        t.objectPattern(
          closureVariables.map(
            (variable) => t.objectProperty(
              t.identifier(variable.name),
              t.identifier(variable.name),
              false,
              true
            )
          )
        ),
        t.memberExpression(t.thisExpression(), t.identifier("_closure"))
      )
    ]);
    function prependClosure(path) {
      if (closureVariables.length === 0 || path.parent.type !== "Program") {
        return;
      }
      if (!BabelTypes.isExpression(path.node.body))
        path.node.body.body.unshift(closureDeclaration);
    }
    function prependRecursiveDeclaration(path) {
      var _a;
      if (path.parent.type === "Program" && !BabelTypes.isArrowFunctionExpression(path.node) && !BabelTypes.isObjectMethod(path.node) && path.node.id && path.scope.parent) {
        const hasRecursiveCalls = ((_a = path.scope.parent.bindings[path.node.id.name]) == null ? void 0 : _a.references) > 0;
        if (hasRecursiveCalls) {
          path.node.body.body.unshift(
            t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier(path.node.id.name),
                t.memberExpression(t.thisExpression(), t.identifier("_recur"))
              )
            ])
          );
        }
      }
    }
    return {
      visitor: {
        "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod": (path) => {
          prependClosure(path);
          prependRecursiveDeclaration(path);
        }
      }
    };
  }
  const draftExpression = fun.program.body.find(
    (obj) => BabelTypes.isFunctionDeclaration(obj)
  ) || fun.program.body.find((obj) => BabelTypes.isExpressionStatement(obj)) || void 0;
  if (!draftExpression)
    throw new Error("'draftExpression' is not defined\n");
  const expression = BabelTypes.isFunctionDeclaration(draftExpression) ? draftExpression : draftExpression.expression;
  if (!("params" in expression && BabelTypes.isBlockStatement(expression.body)))
    throw new Error(
      "'expression' doesn't have property 'params' or 'expression.body' is not a BlockStatmenent\n'"
    );
  const workletFunction = BabelTypes.functionExpression(
    BabelTypes.identifier(name),
    expression.params,
    expression.body
  );
  const code = (0, import_generator.default)(workletFunction).code;
  if (!inputMap)
    throw new Error("'inputMap' is not defined");
  const includeSourceMap = shouldGenerateSourceMap();
  if (includeSourceMap) {
    inputMap.sourcesContent = [];
    for (const sourceFile of inputMap.sources) {
      inputMap.sourcesContent.push(
        fs.readFileSync(sourceFile).toString("utf-8")
      );
    }
  }
  const transformed = (0, import_core.transformSync)(code, {
    plugins: [prependClosureVariablesIfNecessary()],
    compact: !includeSourceMap,
    sourceMaps: includeSourceMap,
    inputSourceMap: inputMap,
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false
  });
  if (!transformed)
    throw new Error("transformed is null!\n");
  let sourceMap;
  if (includeSourceMap) {
    sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
    delete sourceMap.sourcesContent;
  }
  return [transformed.code, JSON.stringify(sourceMap)];
}
function makeWorkletName(t, fun) {
  if (t.isObjectMethod(fun.node) && "name" in fun.node.key) {
    return fun.node.key.name;
  }
  if (t.isFunctionDeclaration(fun.node) && fun.node.id) {
    return fun.node.id.name;
  }
  if (BabelTypes.isFunctionExpression(fun.node) && BabelTypes.isIdentifier(fun.node.id)) {
    return fun.node.id.name;
  }
  return "anonymous";
}
function makeWorklet(t, fun, state) {
  const functionName = makeWorkletName(t, fun);
  const closure = /* @__PURE__ */ new Map();
  fun.traverse({
    DirectiveLiteral(path) {
      if (path.node.value === "worklet" && path.getFunctionParent() === fun) {
        path.parentPath.remove();
      }
    }
  });
  if (!state.file.opts.filename)
    throw new Error("'state.file.opts.filename' is undefined\n");
  const codeObject = (0, import_generator.default)(fun.node, {
    sourceMaps: true,
    sourceFileName: state.file.opts.filename
  });
  const code = "(" + (t.isObjectMethod(fun) ? "function " : "") + codeObject.code + "\n)";
  const transformed = (0, import_core.transformSync)(code, {
    filename: state.file.opts.filename,
    presets: ["@babel/preset-typescript"],
    plugins: [
      "@babel/plugin-transform-shorthand-properties",
      "@babel/plugin-transform-arrow-functions",
      "@babel/plugin-proposal-optional-chaining",
      "@babel/plugin-proposal-nullish-coalescing-operator",
      ["@babel/plugin-transform-template-literals", { loose: true }]
    ],
    ast: true,
    babelrc: false,
    configFile: false,
    inputSourceMap: codeObject.map
  });
  if (!transformed || !transformed.ast)
    throw new Error("'transformed' or 'transformed.ast' is undefined\n");
  (0, import_traverse.default)(transformed.ast, {
    Identifier(path) {
      if (!path.isReferencedIdentifier())
        return;
      const name = path.node.name;
      if (globals.has(name) || !BabelTypes.isArrowFunctionExpression(fun.node) && !BabelTypes.isObjectMethod(fun.node) && fun.node.id && fun.node.id.name === name) {
        return;
      }
      const parentNode = path.parent;
      if (parentNode.type === "MemberExpression" && parentNode.property === path.node && !parentNode.computed) {
        return;
      }
      if (parentNode.type === "ObjectProperty" && path.parentPath.parent.type === "ObjectExpression" && path.node !== parentNode.value) {
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
    }
  });
  const variables = Array.from(closure.values());
  const privateFunctionId = t.identifier("_f");
  const clone = t.cloneNode(fun.node);
  const funExpression = BabelTypes.isBlockStatement(clone.body) ? BabelTypes.functionExpression(null, clone.params, clone.body) : clone;
  const [funString, sourceMapString] = buildWorkletString(
    t,
    transformed.ast,
    variables,
    functionName,
    transformed.map
  );
  if (!funString)
    throw new Error("'funString' is not defined\n");
  const workletHash = hash(funString);
  let location = state.file.opts.filename;
  if (state.opts.relativeSourceLocation) {
    const path = require("path");
    location = path.relative(state.cwd, location);
  }
  let lineOffset = 1;
  if (closure.size > 0) {
    lineOffset -= closure.size + 2;
  }
  const pathForStringDefinitions = fun.parentPath.isProgram() ? fun : fun.findParent(
    (path) => path.parentPath.isProgram()
    // this causes typescript error on Windows CI build
  );
  const initDataId = pathForStringDefinitions.parentPath.scope.generateUidIdentifier(`worklet_${workletHash}_init_data`);
  const initDataObjectExpression = t.objectExpression([
    t.objectProperty(t.identifier("code"), t.stringLiteral(funString)),
    t.objectProperty(t.identifier("location"), t.stringLiteral(location))
  ]);
  if (sourceMapString) {
    initDataObjectExpression.properties.push(
      t.objectProperty(
        t.identifier("sourceMap"),
        t.stringLiteral(sourceMapString)
      )
    );
  }
  pathForStringDefinitions.insertBefore(
    t.variableDeclaration("const", [
      t.variableDeclarator(initDataId, initDataObjectExpression)
    ])
  );
  if (BabelTypes.isFunctionDeclaration(funExpression) || BabelTypes.isObjectMethod(funExpression))
    throw new Error(
      "'funExpression' is either FunctionDeclaration or ObjectMethod and cannot be used in variableDeclaration\n"
    );
  const statements = [
    t.variableDeclaration("const", [
      t.variableDeclarator(privateFunctionId, funExpression)
    ]),
    t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.memberExpression(privateFunctionId, t.identifier("_closure"), false),
        t.objectExpression(
          variables.map(
            (variable) => t.objectProperty(t.identifier(variable.name), variable, false, true)
          )
        )
      )
    ),
    t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.memberExpression(
          privateFunctionId,
          t.identifier("__initData"),
          false
        ),
        initDataId
      )
    ),
    t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.memberExpression(
          privateFunctionId,
          t.identifier("__workletHash"),
          false
        ),
        t.numericLiteral(workletHash)
      )
    )
  ];
  if (!isRelease()) {
    statements.unshift(
      t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier("_e"),
          t.arrayExpression([
            t.newExpression(
              t.memberExpression(t.identifier("global"), t.identifier("Error")),
              []
            ),
            t.numericLiteral(lineOffset),
            t.numericLiteral(-27)
            // the placement of opening bracket after Exception in line that defined '_e' variable
          ])
        )
      ])
    );
    statements.push(
      t.expressionStatement(
        t.assignmentExpression(
          "=",
          t.memberExpression(
            privateFunctionId,
            t.identifier("__stackDetails"),
            false
          ),
          t.identifier("_e")
        )
      )
    );
  }
  statements.push(t.returnStatement(privateFunctionId));
  const newFun = t.functionExpression(
    // !BabelTypes.isArrowFunctionExpression(fun.node) ? fun.node.id : undefined, // [TO DO] --- this never worked
    void 0,
    [],
    t.blockStatement(statements)
  );
  return newFun;
}
var BabelTypes, import_generator, import_traverse, import_core, fs, convertSourceMap;
var init_makeWorklet = __esm({
  "src/makeWorklet.ts"() {
    "use strict";
    BabelTypes = __toESM(require("@babel/types"));
    import_generator = __toESM(require("@babel/generator"));
    import_traverse = __toESM(require("@babel/traverse"));
    import_core = require("@babel/core");
    fs = __toESM(require("fs"));
    convertSourceMap = __toESM(require("convert-source-map"));
    init_commonFunctions();
    init_commonObjects();
  }
});

// src/processWorkletObjectMethod.ts
function processWorkletObjectMethod(t, path, state) {
  if (!BabelTypes2.isFunctionParent(path))
    return;
  const newFun = makeWorklet(t, path, state);
  const replacement = BabelTypes2.objectProperty(
    BabelTypes2.identifier(
      BabelTypes2.isIdentifier(path.node.key) ? path.node.key.name : ""
    ),
    t.callExpression(newFun, [])
  );
  path.replaceWith(replacement);
}
var BabelTypes2;
var init_processWorkletObjectMethod = __esm({
  "src/processWorkletObjectMethod.ts"() {
    "use strict";
    BabelTypes2 = __toESM(require("@babel/types"));
    init_makeWorklet();
  }
});

// src/processWorkletFunction.ts
function processWorkletFunction(t, fun, state) {
  if (!t.isFunctionParent(fun)) {
    return;
  }
  const newFun = makeWorklet(t, fun, state);
  const replacement = t.callExpression(newFun, []);
  const needDeclaration = t.isScopable(fun.parent) || t.isExportNamedDeclaration(fun.parent);
  fun.replaceWith(
    !BabelTypes3.isArrowFunctionExpression(fun.node) && fun.node.id && needDeclaration ? t.variableDeclaration("const", [
      t.variableDeclarator(fun.node.id, replacement)
    ]) : replacement
  );
}
var BabelTypes3;
var init_processWorkletFunction = __esm({
  "src/processWorkletFunction.ts"() {
    "use strict";
    BabelTypes3 = __toESM(require("@babel/types"));
    init_makeWorklet();
  }
});

// src/processWorklets.ts
var processWorklets_exports = {};
__export(processWorklets_exports, {
  processWorklets: () => processWorklets
});
function processWorklets(t, path, state) {
  const callee = BabelTypes4.isSequenceExpression(path.node.callee) ? path.node.callee.expressions[path.node.callee.expressions.length - 1] : path.node.callee;
  let name = "";
  if ("name" in callee)
    name = callee.name;
  else if ("property" in callee && "name" in callee.property)
    name = callee.property.name;
  if (objectHooks.has(name) && BabelTypes4.isObjectExpression(
    path.get("arguments.0").node
  )) {
    const properties = path.get("arguments.0.properties");
    for (const property of properties) {
      if (t.isObjectMethod(property.node)) {
        processWorkletObjectMethod(
          t,
          property,
          state
        );
      } else {
        const value = property.get("value");
        processWorkletFunction(
          t,
          value,
          state
        );
      }
    }
  } else {
    const indexes = functionArgsToWorkletize.get(name);
    if (Array.isArray(indexes)) {
      indexes.forEach((index) => {
        processWorkletFunction(
          t,
          path.get(`arguments.${index}`),
          state
        );
      });
    }
  }
}
var BabelTypes4;
var init_processWorklets = __esm({
  "src/processWorklets.ts"() {
    "use strict";
    BabelTypes4 = __toESM(require("@babel/types"));
    init_commonObjects();
    init_processWorkletObjectMethod();
    init_processWorkletFunction();
  }
});

// src/processIfWorkletNode.ts
var processIfWorkletNode_exports = {};
__export(processIfWorkletNode_exports, {
  processIfWorkletNode: () => processIfWorkletNode
});
function processIfWorkletNode(t, fun, state) {
  fun.traverse({
    DirectiveLiteral(path) {
      const value = path.node.value;
      if (value === "worklet" && path.getFunctionParent() === fun && BabelTypes5.isBlockStatement(fun.node.body)) {
        const directives = fun.node.body.directives;
        if (directives && directives.length > 0 && directives.some(
          (directive) => t.isDirectiveLiteral(directive.value) && directive.value.value === "worklet"
        )) {
          processWorkletFunction(t, fun, state);
        }
      }
    }
  });
}
var BabelTypes5;
var init_processIfWorkletNode = __esm({
  "src/processIfWorkletNode.ts"() {
    "use strict";
    BabelTypes5 = __toESM(require("@babel/types"));
    init_processWorkletFunction();
  }
});

// src/processIfGestureHandlerEventCallbackFunctionNode.ts
var processIfGestureHandlerEventCallbackFunctionNode_exports = {};
__export(processIfGestureHandlerEventCallbackFunctionNode_exports, {
  processIfGestureHandlerEventCallbackFunctionNode: () => processIfGestureHandlerEventCallbackFunctionNode
});
function processIfGestureHandlerEventCallbackFunctionNode(t, fun, state) {
  if (t.isCallExpression(fun.parent) && t.isExpression(fun.parent.callee) && isGestureObjectEventCallbackMethod(t, fun.parent.callee)) {
    processWorkletFunction(t, fun, state);
  }
}
function isGestureObjectEventCallbackMethod(t, node) {
  return t.isMemberExpression(node) && t.isIdentifier(node.property) && gestureHandlerBuilderMethods.has(node.property.name) && containsGestureObject(t, node.object);
}
function containsGestureObject(t, node) {
  if (isGestureObject(t, node)) {
    return true;
  }
  if (t.isCallExpression(node) && t.isMemberExpression(node.callee) && containsGestureObject(t, node.callee.object)) {
    return true;
  }
  return false;
}
function isGestureObject(t, node) {
  return t.isCallExpression(node) && t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.object) && node.callee.object.name === "Gesture" && t.isIdentifier(node.callee.property) && gestureHandlerGestureObjects.has(node.callee.property.name);
}
var init_processIfGestureHandlerEventCallbackFunctionNode = __esm({
  "src/processIfGestureHandlerEventCallbackFunctionNode.ts"() {
    "use strict";
    init_processWorkletFunction();
    init_commonObjects();
  }
});

// src/processInlineStylesWarning.ts
var processInlineStylesWarning_exports = {};
__export(processInlineStylesWarning_exports, {
  processInlineStylesWarning: () => processInlineStylesWarning
});
function generateInlineStylesWarning(t, memberExpression2) {
  return t.callExpression(
    t.arrowFunctionExpression(
      [],
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier("console"), t.identifier("warn")),
            [
              t.callExpression(
                t.memberExpression(
                  t.callExpression(t.identifier("require"), [
                    t.stringLiteral("react-native-reanimated")
                  ]),
                  t.identifier("getUseOfValueInStyleWarning")
                ),
                []
              )
            ]
          )
        ),
        t.returnStatement(memberExpression2.node)
      ])
    ),
    []
  );
}
function processPropertyValueForInlineStylesWarning(t, path) {
  if (t.isMemberExpression(path.node) && t.isIdentifier(path.node.property)) {
    if (path.node.property.name === "value") {
      path.replaceWith(
        generateInlineStylesWarning(
          t,
          path
        )
      );
    }
  }
}
function processTransformPropertyForInlineStylesWarning(t, path) {
  if (t.isArrayExpression(path.node)) {
    const elements = path.get("elements");
    for (const element of elements) {
      if (t.isObjectExpression(element.node)) {
        processStyleObjectForInlineStylesWarning(
          t,
          element
        );
      }
    }
  }
}
function processStyleObjectForInlineStylesWarning(t, path) {
  const properties = path.get("properties");
  for (const property of properties) {
    if (!BabelTypes6.isObjectProperty(property.node))
      continue;
    const value = property.get("value");
    if (t.isObjectProperty(property)) {
      if (t.isIdentifier(property.node.key) && property.node.key.name === "transform") {
        processTransformPropertyForInlineStylesWarning(t, value);
      } else {
        processPropertyValueForInlineStylesWarning(t, value);
      }
    }
  }
}
function processInlineStylesWarning(t, path, state) {
  if (isRelease())
    return;
  if (state.opts.disableInlineStylesWarning)
    return;
  if (path.node.name.name !== "style")
    return;
  if (!t.isJSXExpressionContainer(path.node.value))
    return;
  const expression = path.get("value").get("expression");
  if (BabelTypes6.isArrayExpression(expression.node)) {
    const elements = expression.get("elements");
    for (const element of elements) {
      if (t.isObjectExpression(element.node)) {
        processStyleObjectForInlineStylesWarning(
          t,
          element
        );
      }
    }
  } else if (t.isObjectExpression(expression.node)) {
    processStyleObjectForInlineStylesWarning(
      t,
      expression
    );
  }
}
var BabelTypes6;
var init_processInlineStylesWarning = __esm({
  "src/processInlineStylesWarning.ts"() {
    "use strict";
    BabelTypes6 = __toESM(require("@babel/types"));
    init_commonFunctions();
  }
});

// ../package.json
var package_default;
var init_package = __esm({
  "../package.json"() {
    package_default = {
      name: "react-native-reanimated",
      version: "3.0.2",
      description: "More powerful alternative to Animated library for React Native.",
      scripts: {
        test: "yarn run format:js && yarn run lint:js && yarn run test:unit",
        "test:unit": "jest",
        lint: "yarn lint:js && yarn lint:plugin && yarn lint:cpp && yarn lint:java && yarn lint:ios && yarn lint:docs",
        "lint:js": "eslint --ext '.js,.ts,.tsx' src/ && yarn prettier --check src/",
        "lint:plugin": "cd plugin && yarn lint && cd ..",
        "lint:docs": "cd docs && yarn lint && cd ..",
        "lint:java": "./android/gradlew -p android spotlessCheck -q",
        "lint:cpp": "./scripts/cpplint.sh",
        "lint:ios": "./scripts/validate-ios.sh && yarn format:ios --dry-run",
        format: "yarn format:js && yarn format:plugin && yarn format:java && yarn format:ios && yarn format:android && yarn format:common",
        "format:js": "prettier --write --list-different './src/'",
        "format:plugin": "cd plugin && yarn format && cd ..",
        "format:java": "node ./scripts/format-java.js",
        "format:ios": "find ios/ -iname *.h -o -iname *.m -o -iname *.mm -o -iname *.cpp | xargs clang-format -i --Werror",
        "format:android": "find android/src/ -iname *.h -o -iname *.cpp | xargs clang-format -i",
        "format:common": "find Common/ -iname *.h -o -iname *.cpp | xargs clang-format -i",
        release: "npm login && release-it",
        "type:check": "yarn tsc --noEmit && cd plugin && yarn type:check && cd ..",
        prepare: "bob build && husky install && yarn plugin",
        circular_dependency_check: "yarn madge --extensions js,ts,tsx --circular src lib",
        setup: "yarn && cd Example && yarn && cd ios && pod install --verbose && cd ../..",
        clean: "rm -rf node_modules && cd Example && rm -rf node_modules && cd ios && pod deintegrate && cd ../..",
        reset: "yarn clean && yarn setup",
        "clean:deep": "cd android && rm -rf .cxx .gradle build && cd ../Example/android && rm -rf .gradle build app/build && cd ../.. && yarn clean",
        "reset:deep": "yarn clean:deep && yarn setup",
        plugin: "cd plugin && yarn && cd .."
      },
      main: "lib/commonjs/index",
      module: "lib/module/index",
      "react-native": "src/index",
      source: "src/index",
      types: "react-native-reanimated.d.ts",
      files: [
        "Common/",
        "src/",
        "lib/",
        "react-native-reanimated.d.ts",
        "android/src/main/AndroidManifest.xml",
        "android/src/main/java/",
        "android/build.gradle",
        "android/",
        "ios/",
        "RNReanimated.podspec",
        "scripts/reanimated_utils.rb",
        "README.md",
        "mock.js",
        "plugin/",
        "!**/__tests__",
        "!**/__fixtures__",
        "!**/__mocks__",
        "!lib/typescript",
        "!ios/build/",
        "!android/build/",
        "!android/.cxx/",
        "!android/.gradle/",
        "!__snapshots__",
        "!*.test.js",
        "!*.test.js.map",
        "!**/node_modules"
      ],
      repository: {
        type: "git",
        url: "git+https://github.com/software-mansion/react-native-reanimated.git"
      },
      author: {
        email: "krzys.magiera@gmail.com",
        name: "Krzysztof Magiera"
      },
      license: "MIT",
      readmeFilename: "README.md",
      bugs: {
        url: "https://github.com/software-mansion/react-native-reanimated/issues"
      },
      homepage: "https://github.com/software-mansion/react-native-reanimated#readme",
      dependencies: {
        "@babel/plugin-transform-object-assign": "^7.16.7",
        "@babel/preset-typescript": "^7.16.7",
        "convert-source-map": "^2.0.0",
        invariant: "^2.2.4",
        "lodash.isequal": "^4.5.0",
        setimmediate: "^1.0.5",
        "string-hash-64": "^1.0.3"
      },
      peerDependencies: {
        "@babel/core": "^7.0.0-0",
        react: "*",
        "react-native": "*"
      },
      devDependencies: {
        "@types/node": "12.7.12",
        "@babel/cli": "^7.17.6",
        "@babel/core": "^7.20.0",
        "@babel/plugin-proposal-class-properties": "^7.16.7",
        "@babel/plugin-proposal-optional-chaining": "^7.16.7",
        "@babel/preset-env": "^7.20.0",
        "@react-native-community/eslint-config": "^3.2.0",
        "@testing-library/jest-native": "^4.0.4",
        "@testing-library/react-hooks": "^8.0.0",
        "@testing-library/react-native": "^7.1.0",
        "@types/convert-source-map": "^2.0.0",
        "@types/babel-types": "^7.0.11",
        "@types/babel__core": "^7.1.18",
        "@types/babel__generator": "^7.6.4",
        "@types/babel__traverse": "^7.14.2",
        "@types/invariant": "^2.2.35",
        "@types/jest": "^27.4.0",
        "@types/react": "^18.0.26",
        "@typescript-eslint/eslint-plugin": "^5.11.0",
        "@typescript-eslint/parser": "^5.11.0",
        "babel-eslint": "^10.1.0",
        "babel-jest": "^27.5.1",
        "babel-plugin-module-resolver": "^4.1.0",
        "clang-format": "^1.6.0",
        eslint: "^8.8.0",
        "eslint-config-prettier": "^8.3.0",
        "eslint-config-standard": "^16.0.3",
        "eslint-import-resolver-babel-module": "^5.3.1",
        "eslint-plugin-import": "^2.25.4",
        "eslint-plugin-jest": "^27.2.1",
        "eslint-plugin-node": "^11.1.0",
        "eslint-plugin-promise": "^6.0.0",
        "eslint-plugin-standard": "^5.0.0",
        husky: "^7.0.4",
        jest: "^27.5.1",
        "lint-staged": "^11.2.0",
        madge: "^5.0.1",
        prettier: "^2.5.1",
        react: "17.0.2",
        "react-native": "0.71.3",
        "react-native-builder-bob": "^0.18.3",
        "react-native-gesture-handler": "^2.4.2",
        "react-test-renderer": "17.0.2",
        "release-it": "^13.7.2",
        typescript: "^4.1.3"
      },
      "lint-staged": {
        "*.(js|ts|tsx)": [
          "eslint --ext '.js,.ts,.tsx' src/ --ignore-pattern src/reanimated1 --ignore-pattern react-native-reanimated.d.ts --ignore-pattern docs --ignore-pattern plugin",
          "prettier --write"
        ],
        "plugin/**/*.ts": "yarn lint:plugin",
        "**/*.{h,cpp}": "yarn lint:cpp",
        "android/src/**/*.java": "yarn format:java",
        "android/src/**/*.{h,cpp}": "yarn format:android",
        "ios/**/*.{h,m,mm,cpp}": "yarn format:ios",
        "Common/**/*.{h,cpp}": "yarn format:common",
        "docs/**/*.{md,mdx}": "yarn lint:docs"
      },
      "release-it": {
        hooks: {
          "before:git:bump": [
            "# check if version corresponds to changes in native files  \n  if git diff --name-only ${latestVersion} HEAD | egrep '(android/.*)|(ios/.*)' -q ; then egrep '\\.0$' -q <<< ${version} ; else true ; fi ;"
          ]
        }
      },
      "react-native-builder-bob": {
        source: "src",
        output: "lib",
        targets: [
          "commonjs",
          "module",
          [
            "typescript",
            {
              project: "tsconfig.json"
            }
          ]
        ]
      },
      sideEffects: [
        "./lib/reanimated2/core",
        "./lib/reanimated2/js-reanimated/global",
        "./lib/index"
      ]
    };
  }
});

// src/injectVersion.ts
var injectVersion_exports = {};
__export(injectVersion_exports, {
  injectVersion: () => injectVersion
});
function injectVersion(path) {
  if (path.node.value !== "inject Reanimated Babel plugin version") {
    return;
  }
  const injectedName = "_REANIMATED_VERSION_BABEL_PLUGIN";
  const versionString = package_default.version;
  const pluginVersionNode = BabelTypes7.expressionStatement(
    BabelTypes7.assignmentExpression(
      "=",
      BabelTypes7.memberExpression(
        BabelTypes7.identifier("global"),
        BabelTypes7.identifier(injectedName)
      ),
      BabelTypes7.stringLiteral(versionString)
    )
  );
  const functionParent = path.getFunctionParent().node;
  functionParent.body.directives = [];
  functionParent.body.body.unshift(pluginVersionNode);
}
var BabelTypes7;
var init_injectVersion = __esm({
  "src/injectVersion.ts"() {
    "use strict";
    BabelTypes7 = __toESM(require("@babel/types"));
    init_package();
  }
});

// src/plugin.js
Object.defineProperty(exports, "__esModule", { value: true });
var commonObjects_1 = (init_commonObjects(), __toCommonJS(commonObjects_exports));
var processWorklets_1 = (init_processWorklets(), __toCommonJS(processWorklets_exports));
var processIfWorkletNode_1 = (init_processIfWorkletNode(), __toCommonJS(processIfWorkletNode_exports));
var processIfGestureHandlerEventCallbackFunctionNode_1 = (init_processIfGestureHandlerEventCallbackFunctionNode(), __toCommonJS(processIfGestureHandlerEventCallbackFunctionNode_exports));
var processInlineStylesWarning_1 = (init_processInlineStylesWarning(), __toCommonJS(processInlineStylesWarning_exports));
var injectVersion_1 = (init_injectVersion(), __toCommonJS(injectVersion_exports));
module.exports = function({ types: t }) {
  return {
    pre() {
      if (this.opts != null && Array.isArray(this.opts.globals)) {
        this.opts.globals.forEach((name) => {
          commonObjects_1.globals.add(name);
        });
      }
    },
    visitor: {
      DirectiveLiteral: {
        enter(path) {
          (0, injectVersion_1.injectVersion)(path);
        }
      },
      CallExpression: {
        enter(path, state) {
          (0, processWorklets_1.processWorklets)(t, path, state);
        }
      },
      "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression": {
        enter(path, state) {
          (0, processIfWorkletNode_1.processIfWorkletNode)(t, path, state);
          (0, processIfGestureHandlerEventCallbackFunctionNode_1.processIfGestureHandlerEventCallbackFunctionNode)(t, path, state);
        }
      },
      JSXAttribute: {
        enter(path, state) {
          (0, processInlineStylesWarning_1.processInlineStylesWarning)(t, path, state);
        }
      }
    }
  };
};
//# sourceMappingURL=index.js.map
