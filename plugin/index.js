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

// src/asserts.ts
function assertIsDefined(value) {
  if (value === void 0 || value === null) {
    throw new Error(`${value} is not defined`);
  }
}
var init_asserts = __esm({
  "src/asserts.ts"() {
    "use strict";
  }
});

// src/makeWorklet.ts
function buildWorkletString(fun, closureVariables, name, inputMap) {
  function prependClosureVariablesIfNecessary() {
    const closureDeclaration = (0, import_types.variableDeclaration)("const", [
      (0, import_types.variableDeclarator)(
        (0, import_types.objectPattern)(
          closureVariables.map(
            (variable) => (0, import_types.objectProperty)(
              (0, import_types.identifier)(variable.name),
              (0, import_types.identifier)(variable.name),
              false,
              true
            )
          )
        ),
        (0, import_types.memberExpression)((0, import_types.thisExpression)(), (0, import_types.identifier)("_closure"))
      )
    ]);
    function prependClosure(path) {
      if (closureVariables.length === 0 || !(0, import_types.isProgram)(path.parent)) {
        return;
      }
      if (!(0, import_types.isExpression)(path.node.body))
        path.node.body.body.unshift(closureDeclaration);
    }
    function prependRecursiveDeclaration(path) {
      var _a;
      if ((0, import_types.isProgram)(path.parent) && !(0, import_types.isArrowFunctionExpression)(path.node) && !(0, import_types.isObjectMethod)(path.node) && path.node.id && path.scope.parent) {
        const hasRecursiveCalls = ((_a = path.scope.parent.bindings[path.node.id.name]) == null ? void 0 : _a.references) > 0;
        if (hasRecursiveCalls) {
          path.node.body.body.unshift(
            (0, import_types.variableDeclaration)("const", [
              (0, import_types.variableDeclarator)(
                (0, import_types.identifier)(path.node.id.name),
                (0, import_types.memberExpression)((0, import_types.thisExpression)(), (0, import_types.identifier)("_recur"))
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
    (obj) => (0, import_types.isFunctionDeclaration)(obj)
  ) || fun.program.body.find((obj) => (0, import_types.isExpressionStatement)(obj)) || void 0;
  assertIsDefined(draftExpression);
  const expression = (0, import_types.isFunctionDeclaration)(draftExpression) ? draftExpression : draftExpression.expression;
  if (!("params" in expression && (0, import_types.isBlockStatement)(expression.body)))
    throw new Error(
      "'expression' doesn't have property 'params' or 'expression.body' is not a BlockStatmenent!\n'"
    );
  const workletFunction = (0, import_types.functionExpression)(
    (0, import_types.identifier)(name),
    expression.params,
    expression.body
  );
  const code = (0, import_generator.default)(workletFunction).code;
  assertIsDefined(inputMap);
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
  assertIsDefined(transformed);
  let sourceMap;
  if (includeSourceMap) {
    sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
    delete sourceMap.sourcesContent;
  }
  return [transformed.code, JSON.stringify(sourceMap)];
}
function makeWorkletName(fun) {
  if ((0, import_types.isObjectMethod)(fun.node) && "name" in fun.node.key) {
    return fun.node.key.name;
  }
  if ((0, import_types.isFunctionDeclaration)(fun.node) && fun.node.id) {
    return fun.node.id.name;
  }
  if ((0, import_types.isFunctionExpression)(fun.node) && (0, import_types.isIdentifier)(fun.node.id)) {
    return fun.node.id.name;
  }
  return "anonymous";
}
function makeWorklet(fun, state) {
  const functionName = makeWorkletName(fun);
  const closure = /* @__PURE__ */ new Map();
  fun.traverse({
    DirectiveLiteral(path) {
      if (path.node.value === "worklet" && path.getFunctionParent() === fun) {
        path.parentPath.remove();
      }
    }
  });
  assertIsDefined(state.file.opts.filename);
  const codeObject = (0, import_generator.default)(fun.node, {
    sourceMaps: true,
    sourceFileName: state.file.opts.filename
  });
  const code = "(" + ((0, import_types.isObjectMethod)(fun) ? "function " : "") + codeObject.code + "\n)";
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
  assertIsDefined(transformed);
  assertIsDefined(transformed.ast);
  (0, import_core.traverse)(transformed.ast, {
    Identifier(path) {
      if (!path.isReferencedIdentifier())
        return;
      const name = path.node.name;
      if (globals.has(name) || "id" in fun.node && fun.node.id && "name" in fun.node.id && fun.node.id.name === name) {
        return;
      }
      const parentNode = path.parent;
      if ((0, import_types.isMemberExpression)(parentNode) && parentNode.property === path.node && !parentNode.computed) {
        return;
      }
      if ((0, import_types.isObjectProperty)(parentNode) && (0, import_types.isObjectExpression)(path.parentPath.parent) && path.node !== parentNode.value) {
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
  const privateFunctionId = (0, import_types.identifier)("_f");
  const clone = (0, import_types.cloneNode)(fun.node);
  const funExpression = (0, import_types.isBlockStatement)(clone.body) ? (0, import_types.functionExpression)(null, clone.params, clone.body) : clone;
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
    const path = require("path");
    location = path.relative(state.cwd, location);
  }
  let lineOffset = 1;
  if (closure.size > 0) {
    lineOffset -= closure.size + 2;
  }
  const pathForStringDefinitions = fun.parentPath.isProgram() ? fun : fun.findParent(
    (path) => path.parentPath.isProgram()
    // lack of this 'as ...' causes typescript error on Windows CI build
  );
  const initDataId = pathForStringDefinitions.parentPath.scope.generateUidIdentifier(`worklet_${workletHash}_init_data`);
  const initDataObjectExpression = (0, import_types.objectExpression)([
    (0, import_types.objectProperty)((0, import_types.identifier)("code"), (0, import_types.stringLiteral)(funString)),
    (0, import_types.objectProperty)((0, import_types.identifier)("location"), (0, import_types.stringLiteral)(location))
  ]);
  if (sourceMapString) {
    initDataObjectExpression.properties.push(
      (0, import_types.objectProperty)((0, import_types.identifier)("sourceMap"), (0, import_types.stringLiteral)(sourceMapString))
    );
  }
  pathForStringDefinitions.insertBefore(
    (0, import_types.variableDeclaration)("const", [
      (0, import_types.variableDeclarator)(initDataId, initDataObjectExpression)
    ])
  );
  if ((0, import_types.isFunctionDeclaration)(funExpression) || (0, import_types.isObjectMethod)(funExpression))
    throw new Error(
      "'funExpression' is either FunctionDeclaration or ObjectMethod and cannot be used in variableDeclaration\n"
    );
  const statements = [
    (0, import_types.variableDeclaration)("const", [
      (0, import_types.variableDeclarator)(privateFunctionId, funExpression)
    ]),
    (0, import_types.expressionStatement)(
      (0, import_types.assignmentExpression)(
        "=",
        (0, import_types.memberExpression)(privateFunctionId, (0, import_types.identifier)("_closure"), false),
        (0, import_types.objectExpression)(
          variables.map(
            (variable) => (0, import_types.objectProperty)((0, import_types.identifier)(variable.name), variable, false, true)
          )
        )
      )
    ),
    (0, import_types.expressionStatement)(
      (0, import_types.assignmentExpression)(
        "=",
        (0, import_types.memberExpression)(privateFunctionId, (0, import_types.identifier)("__initData"), false),
        initDataId
      )
    ),
    (0, import_types.expressionStatement)(
      (0, import_types.assignmentExpression)(
        "=",
        (0, import_types.memberExpression)(privateFunctionId, (0, import_types.identifier)("__workletHash"), false),
        (0, import_types.numericLiteral)(workletHash)
      )
    )
  ];
  if (!isRelease()) {
    statements.unshift(
      (0, import_types.variableDeclaration)("const", [
        (0, import_types.variableDeclarator)(
          (0, import_types.identifier)("_e"),
          (0, import_types.arrayExpression)([
            (0, import_types.newExpression)(
              (0, import_types.memberExpression)((0, import_types.identifier)("global"), (0, import_types.identifier)("Error")),
              []
            ),
            (0, import_types.numericLiteral)(lineOffset),
            (0, import_types.numericLiteral)(-27)
            // the placement of opening bracket after Exception in line that defined '_e' variable
          ])
        )
      ])
    );
    statements.push(
      (0, import_types.expressionStatement)(
        (0, import_types.assignmentExpression)(
          "=",
          (0, import_types.memberExpression)(
            privateFunctionId,
            (0, import_types.identifier)("__stackDetails"),
            false
          ),
          (0, import_types.identifier)("_e")
        )
      )
    );
  }
  statements.push((0, import_types.returnStatement)(privateFunctionId));
  const newFun = (0, import_types.functionExpression)(
    // !isArrowFunctionExpression(fun.node) ? fun.node.id : undefined, // [TO DO] --- this never worked
    void 0,
    [],
    (0, import_types.blockStatement)(statements)
  );
  return newFun;
}
var import_core, import_generator, import_types, fs, convertSourceMap;
var init_makeWorklet = __esm({
  "src/makeWorklet.ts"() {
    "use strict";
    import_core = require("@babel/core");
    import_generator = __toESM(require("@babel/generator"));
    import_types = require("@babel/types");
    fs = __toESM(require("fs"));
    convertSourceMap = __toESM(require("convert-source-map"));
    init_commonFunctions();
    init_commonObjects();
    init_asserts();
  }
});

// src/processWorkletObjectMethod.ts
function processWorkletObjectMethod(path, state) {
  if (!(0, import_types2.isFunctionParent)(path))
    return;
  const newFun = makeWorklet(path, state);
  const replacement = (0, import_types2.objectProperty)(
    (0, import_types2.identifier)((0, import_types2.isIdentifier)(path.node.key) ? path.node.key.name : ""),
    (0, import_types2.callExpression)(newFun, [])
  );
  path.replaceWith(replacement);
}
var import_types2;
var init_processWorkletObjectMethod = __esm({
  "src/processWorkletObjectMethod.ts"() {
    "use strict";
    import_types2 = require("@babel/types");
    init_makeWorklet();
  }
});

// src/processIfWorkletFunction.ts
function processIfWorkletFunction(path, state) {
  if ((0, import_types3.isFunctionDeclaration)(path) || (0, import_types3.isFunctionExpression)(path) || (0, import_types3.isArrowFunctionExpression)(path))
    processWorkletFunction(
      path,
      state
    );
}
function processWorkletFunction(path, state) {
  const newFun = makeWorklet(path, state);
  const replacement = (0, import_types3.callExpression)(newFun, []);
  const needDeclaration = (0, import_types3.isScopable)(path.parent) || (0, import_types3.isExportNamedDeclaration)(path.parent);
  path.replaceWith(
    "id" in path.node && path.node.id && needDeclaration ? (0, import_types3.variableDeclaration)("const", [
      (0, import_types3.variableDeclarator)(path.node.id, replacement)
    ]) : replacement
  );
}
var import_types3;
var init_processIfWorkletFunction = __esm({
  "src/processIfWorkletFunction.ts"() {
    "use strict";
    import_types3 = require("@babel/types");
    init_makeWorklet();
  }
});

// src/processForCalleesWorklets.ts
var processForCalleesWorklets_exports = {};
__export(processForCalleesWorklets_exports, {
  processForCalleesWorklets: () => processForCalleesWorklets
});
function processForCalleesWorklets(path, state) {
  const callee = (0, import_types4.isSequenceExpression)(path.node.callee) ? path.node.callee.expressions[path.node.callee.expressions.length - 1] : path.node.callee;
  let name;
  if ("name" in callee)
    name = callee.name;
  else if ("property" in callee && "name" in callee.property)
    name = callee.property.name;
  else
    return;
  if (objectHooks.has(name)) {
    const workletToProcess = path.get("arguments.0");
    if ((0, import_types4.isObjectExpression)(workletToProcess))
      processObjectHookArgument(
        workletToProcess,
        state
      );
  } else
    processArguments(name, path, state);
}
function processObjectHookArgument(path, state) {
  const properties = path.get("properties");
  for (const property of properties) {
    if ((0, import_types4.isObjectMethod)(property)) {
      processWorkletObjectMethod(property, state);
    } else if ((0, import_types4.isObjectProperty)(property)) {
      const value = property.get("value");
      processIfWorkletFunction(value, state);
    } else {
      throw new Error(
        "[Reanimated] Spread syntax (Babel SpreadElement type) as to-be workletized arguments is not supported for object hooks!\n"
      );
    }
  }
}
function processArguments(name, path, state) {
  const indexes = functionArgsToWorkletize.get(name);
  if (Array.isArray(indexes)) {
    const argumentsArray = path.get("arguments");
    indexes.forEach((index) => {
      const argumentToWorkletize = argumentsArray[index];
      processIfWorkletFunction(argumentToWorkletize, state);
    });
  }
}
var import_types4;
var init_processForCalleesWorklets = __esm({
  "src/processForCalleesWorklets.ts"() {
    "use strict";
    import_types4 = require("@babel/types");
    init_commonObjects();
    init_processWorkletObjectMethod();
    init_processIfWorkletFunction();
  }
});

// src/processIfWorkletNode.ts
var processIfWorkletNode_exports = {};
__export(processIfWorkletNode_exports, {
  processIfWorkletNode: () => processIfWorkletNode
});
function processIfWorkletNode(fun, state) {
  fun.traverse({
    DirectiveLiteral(path) {
      const value = path.node.value;
      if (value === "worklet" && path.getFunctionParent() === fun && (0, import_types5.isBlockStatement)(fun.node.body)) {
        const directives = fun.node.body.directives;
        if (directives && directives.length > 0 && directives.some(
          (directive) => (0, import_types5.isDirectiveLiteral)(directive.value) && directive.value.value === "worklet"
        )) {
          processIfWorkletFunction(fun, state);
        }
      }
    }
  });
}
var import_types5;
var init_processIfWorkletNode = __esm({
  "src/processIfWorkletNode.ts"() {
    "use strict";
    import_types5 = require("@babel/types");
    init_processIfWorkletFunction();
  }
});

// src/processIfGestureHandlerEventCallbackFunctionNode.ts
var processIfGestureHandlerEventCallbackFunctionNode_exports = {};
__export(processIfGestureHandlerEventCallbackFunctionNode_exports, {
  processIfGestureHandlerEventCallbackFunctionNode: () => processIfGestureHandlerEventCallbackFunctionNode
});
function isGestureObject(node) {
  return (0, import_types6.isCallExpression)(node) && (0, import_types6.isMemberExpression)(node.callee) && (0, import_types6.isIdentifier)(node.callee.object) && node.callee.object.name === "Gesture" && (0, import_types6.isIdentifier)(node.callee.property) && gestureHandlerGestureObjects.has(node.callee.property.name);
}
function containsGestureObject(node) {
  if (isGestureObject(node)) {
    return true;
  }
  if ((0, import_types6.isCallExpression)(node) && (0, import_types6.isMemberExpression)(node.callee) && containsGestureObject(node.callee.object)) {
    return true;
  }
  return false;
}
function isGestureObjectEventCallbackMethod(node) {
  return (0, import_types6.isMemberExpression)(node) && (0, import_types6.isIdentifier)(node.property) && gestureHandlerBuilderMethods.has(node.property.name) && containsGestureObject(node.object);
}
function processIfGestureHandlerEventCallbackFunctionNode(path, state) {
  if ((0, import_types6.isCallExpression)(path.parent) && (0, import_types6.isExpression)(path.parent.callee) && isGestureObjectEventCallbackMethod(path.parent.callee)) {
    processIfWorkletFunction(path, state);
  }
}
var import_types6;
var init_processIfGestureHandlerEventCallbackFunctionNode = __esm({
  "src/processIfGestureHandlerEventCallbackFunctionNode.ts"() {
    "use strict";
    import_types6 = require("@babel/types");
    init_processIfWorkletFunction();
    init_commonObjects();
  }
});

// src/processInlineStylesWarning.ts
var processInlineStylesWarning_exports = {};
__export(processInlineStylesWarning_exports, {
  processInlineStylesWarning: () => processInlineStylesWarning
});
function generateInlineStylesWarning(path) {
  return (0, import_types7.callExpression)(
    (0, import_types7.arrowFunctionExpression)(
      [],
      (0, import_types7.blockStatement)([
        (0, import_types7.expressionStatement)(
          (0, import_types7.callExpression)(
            (0, import_types7.memberExpression)((0, import_types7.identifier)("console"), (0, import_types7.identifier)("warn")),
            [
              (0, import_types7.callExpression)(
                (0, import_types7.memberExpression)(
                  (0, import_types7.callExpression)((0, import_types7.identifier)("require"), [
                    (0, import_types7.stringLiteral)("react-native-reanimated")
                  ]),
                  (0, import_types7.identifier)("getUseOfValueInStyleWarning")
                ),
                []
              )
            ]
          )
        ),
        (0, import_types7.returnStatement)(path.node)
      ])
    ),
    []
  );
}
function processPropertyValueForInlineStylesWarning(path) {
  if ((0, import_types7.isMemberExpression)(path.node) && (0, import_types7.isIdentifier)(path.node.property)) {
    if (path.node.property.name === "value") {
      path.replaceWith(
        generateInlineStylesWarning(path)
      );
    }
  }
}
function processTransformPropertyForInlineStylesWarning(path) {
  if ((0, import_types7.isArrayExpression)(path.node)) {
    const elements = path.get("elements");
    for (const element of elements) {
      if ((0, import_types7.isObjectExpression)(element.node)) {
        processStyleObjectForInlineStylesWarning(
          element
        );
      }
    }
  }
}
function processStyleObjectForInlineStylesWarning(path) {
  const properties = path.get("properties");
  for (const property of properties) {
    if (!(0, import_types7.isObjectProperty)(property.node))
      continue;
    const value = property.get("value");
    if ((0, import_types7.isObjectProperty)(property)) {
      if ((0, import_types7.isIdentifier)(property.node.key) && property.node.key.name === "transform") {
        processTransformPropertyForInlineStylesWarning(value);
      } else {
        processPropertyValueForInlineStylesWarning(value);
      }
    }
  }
}
function processInlineStylesWarning(path, state) {
  if (isRelease())
    return;
  if (state.opts.disableInlineStylesWarning)
    return;
  if (path.node.name.name !== "style")
    return;
  if (!(0, import_types7.isJSXExpressionContainer)(path.node.value))
    return;
  const expression = path.get("value").get("expression");
  if ((0, import_types7.isArrayExpression)(expression.node)) {
    const elements = expression.get("elements");
    for (const element of elements) {
      if ((0, import_types7.isObjectExpression)(element.node)) {
        processStyleObjectForInlineStylesWarning(
          element
        );
      }
    }
  } else if ((0, import_types7.isObjectExpression)(expression.node)) {
    processStyleObjectForInlineStylesWarning(
      expression
    );
  }
}
var import_types7;
var init_processInlineStylesWarning = __esm({
  "src/processInlineStylesWarning.ts"() {
    "use strict";
    import_types7 = require("@babel/types");
    init_commonFunctions();
  }
});

// src/plugin.js
Object.defineProperty(exports, "__esModule", { value: true });
var commonObjects_1 = (init_commonObjects(), __toCommonJS(commonObjects_exports));
var processForCalleesWorklets_1 = (init_processForCalleesWorklets(), __toCommonJS(processForCalleesWorklets_exports));
var processIfWorkletNode_1 = (init_processIfWorkletNode(), __toCommonJS(processIfWorkletNode_exports));
var processIfGestureHandlerEventCallbackFunctionNode_1 = (init_processIfGestureHandlerEventCallbackFunctionNode(), __toCommonJS(processIfGestureHandlerEventCallbackFunctionNode_exports));
var processInlineStylesWarning_1 = (init_processInlineStylesWarning(), __toCommonJS(processInlineStylesWarning_exports));
module.exports = function() {
  return {
    pre() {
      if (this.opts != null && Array.isArray(this.opts.globals)) {
        this.opts.globals.forEach((name) => {
          commonObjects_1.globals.add(name);
        });
      }
    },
    visitor: {
      CallExpression: {
        enter(path, state) {
          (0, processForCalleesWorklets_1.processForCalleesWorklets)(path, state);
        }
      },
      "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression": {
        enter(path, state) {
          (0, processIfWorkletNode_1.processIfWorkletNode)(path, state);
          (0, processIfGestureHandlerEventCallbackFunctionNode_1.processIfGestureHandlerEventCallbackFunctionNode)(path, state);
        }
      },
      JSXAttribute: {
        enter(path, state) {
          (0, processInlineStylesWarning_1.processInlineStylesWarning)(path, state);
        }
      }
    }
  };
};
//# sourceMappingURL=index.js.map
