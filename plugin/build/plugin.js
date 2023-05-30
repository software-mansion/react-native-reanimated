"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/commonObjects.js
var require_commonObjects = __commonJS({
  "lib/commonObjects.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.globals = void 0;
    exports2.globals = /* @__PURE__ */ new Set([
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
      "queueMicrotask",
      "_WORKLET",
      "arguments",
      "Boolean",
      "parseInt",
      "parseFloat",
      "Map",
      "WeakMap",
      "Proxy",
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
      "__ErrorUtils",
      "global",
      "_measure",
      "_scrollTo",
      "_dispatchCommand",
      "_setGestureState",
      "isNaN",
      "LayoutAnimationRepository",
      "_notifyAboutProgress",
      "_notifyAboutEnd",
      "_runOnUIQueue"
    ]);
  }
});

// lib/utils.js
var require_utils = __commonJS({
  "lib/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isRelease = void 0;
    function isRelease() {
      return process.env.BABEL_ENV && ["production", "release"].includes(process.env.BABEL_ENV);
    }
    exports2.isRelease = isRelease;
  }
});

// lib/buildWorkletString.js
var require_buildWorkletString = __commonJS({
  "lib/buildWorkletString.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.buildWorkletString = void 0;
    var core_1 = require("@babel/core");
    var generator_1 = __importDefault(require("@babel/generator"));
    var types_1 = require("@babel/types");
    var fs = __importStar(require("fs"));
    var convertSourceMap = __importStar(require("convert-source-map"));
    var assert_1 = require("assert");
    var utils_1 = require_utils();
    function buildWorkletString(fun, closureVariables, name, inputMap) {
      const draftExpression = fun.program.body.find((obj) => (0, types_1.isFunctionDeclaration)(obj)) || fun.program.body.find((obj) => (0, types_1.isExpressionStatement)(obj)) || void 0;
      (0, assert_1.strict)(draftExpression, "'draftExpression' is undefined");
      const expression = (0, types_1.isFunctionDeclaration)(draftExpression) ? draftExpression : draftExpression.expression;
      (0, assert_1.strict)("params" in expression, "'params' property is undefined in 'expression'");
      (0, assert_1.strict)((0, types_1.isBlockStatement)(expression.body), "'expression.body' is not a 'BlockStatement'");
      const workletFunction = (0, types_1.functionExpression)((0, types_1.identifier)(name), expression.params, expression.body);
      const code = (0, generator_1.default)(workletFunction).code;
      (0, assert_1.strict)(inputMap, "'inputMap' is undefined");
      const includeSourceMap = shouldGenerateSourceMap();
      if (includeSourceMap) {
        inputMap.sourcesContent = [];
        for (const sourceFile of inputMap.sources) {
          inputMap.sourcesContent.push(fs.readFileSync(sourceFile).toString("utf-8"));
        }
      }
      const transformed = (0, core_1.transformSync)(code, {
        plugins: [prependClosureVariablesIfNecessary(closureVariables)],
        compact: !includeSourceMap,
        sourceMaps: includeSourceMap,
        inputSourceMap: inputMap,
        ast: false,
        babelrc: false,
        configFile: false,
        comments: false
      });
      (0, assert_1.strict)(transformed, "'transformed' is null");
      let sourceMap;
      if (includeSourceMap) {
        sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
        delete sourceMap.sourcesContent;
      }
      return [transformed.code, JSON.stringify(sourceMap)];
    }
    exports2.buildWorkletString = buildWorkletString;
    function shouldGenerateSourceMap() {
      if ((0, utils_1.isRelease)()) {
        return false;
      }
      if (process.env.REANIMATED_JEST_DISABLE_SOURCEMAP === "jest") {
        return false;
      }
      return true;
    }
    function prependClosure(path, closureVariables, closureDeclaration) {
      if (closureVariables.length === 0 || !(0, types_1.isProgram)(path.parent)) {
        return;
      }
      if (!(0, types_1.isExpression)(path.node.body)) {
        path.node.body.body.unshift(closureDeclaration);
      }
    }
    function prependRecursiveDeclaration(path) {
      var _a;
      if ((0, types_1.isProgram)(path.parent) && !(0, types_1.isArrowFunctionExpression)(path.node) && !(0, types_1.isObjectMethod)(path.node) && path.node.id && path.scope.parent) {
        const hasRecursiveCalls = ((_a = path.scope.parent.bindings[path.node.id.name]) === null || _a === void 0 ? void 0 : _a.references) > 0;
        if (hasRecursiveCalls) {
          path.node.body.body.unshift((0, types_1.variableDeclaration)("const", [
            (0, types_1.variableDeclarator)((0, types_1.identifier)(path.node.id.name), (0, types_1.memberExpression)((0, types_1.thisExpression)(), (0, types_1.identifier)("_recur")))
          ]));
        }
      }
    }
    function prependClosureVariablesIfNecessary(closureVariables) {
      const closureDeclaration = (0, types_1.variableDeclaration)("const", [
        (0, types_1.variableDeclarator)((0, types_1.objectPattern)(closureVariables.map((variable) => (0, types_1.objectProperty)((0, types_1.identifier)(variable.name), (0, types_1.identifier)(variable.name), false, true))), (0, types_1.memberExpression)((0, types_1.thisExpression)(), (0, types_1.identifier)("_closure")))
      ]);
      return {
        visitor: {
          "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod": (path) => {
            prependClosure(path, closureVariables, closureDeclaration);
            prependRecursiveDeclaration(path);
          }
        }
      };
    }
  }
});

// lib/makeWorklet.js
var require_makeWorklet = __commonJS({
  "lib/makeWorklet.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeWorklet = void 0;
    var core_1 = require("@babel/core");
    var generator_1 = __importDefault(require("@babel/generator"));
    var types_1 = require("@babel/types");
    var utils_1 = require_utils();
    var assert_1 = require("assert");
    var commonObjects_12 = require_commonObjects();
    var path_1 = require("path");
    var buildWorkletString_1 = require_buildWorkletString();
    var version = require("../../package.json").version;
    function makeWorklet(fun, state) {
      const functionName = makeWorkletName(fun);
      fun.traverse({
        DirectiveLiteral(path) {
          if (path.node.value === "worklet" && path.getFunctionParent() === fun) {
            path.parentPath.remove();
          }
        }
      });
      (0, assert_1.strict)(state.file.opts.filename, "'state.file.opts.filename' is undefined");
      const codeObject = (0, generator_1.default)(fun.node, {
        sourceMaps: true,
        sourceFileName: state.file.opts.filename
      });
      codeObject.code = "(" + ((0, types_1.isObjectMethod)(fun) ? "function " : "") + codeObject.code + "\n)";
      const transformed = (0, core_1.transformSync)(codeObject.code, {
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
      (0, assert_1.strict)(transformed, "'transformed' is undefined");
      (0, assert_1.strict)(transformed.ast, "'transformed.ast' is undefined");
      const variables = makeArrayFromCapturedBindings(transformed.ast, fun);
      const privateFunctionId = (0, types_1.identifier)("_f");
      const clone = (0, types_1.cloneNode)(fun.node);
      const funExpression = (0, types_1.isBlockStatement)(clone.body) ? (0, types_1.functionExpression)(null, clone.params, clone.body) : clone;
      const [funString, sourceMapString] = (0, buildWorkletString_1.buildWorkletString)(transformed.ast, variables, functionName, transformed.map);
      (0, assert_1.strict)(funString, "'funString' is undefined");
      const workletHash = hash(funString);
      let location = state.file.opts.filename;
      if (state.opts.relativeSourceLocation) {
        location = (0, path_1.relative)(state.cwd, location);
      }
      let lineOffset = 1;
      if (variables.length > 0) {
        lineOffset -= variables.length + 2;
      }
      const pathForStringDefinitions = fun.parentPath.isProgram() ? fun : fun.findParent((path) => (0, types_1.isProgram)(path.parentPath));
      (0, assert_1.strict)(pathForStringDefinitions, "'pathForStringDefinitions' is null");
      (0, assert_1.strict)(pathForStringDefinitions.parentPath, "'pathForStringDefinitions.parentPath' is null");
      const initDataId = pathForStringDefinitions.parentPath.scope.generateUidIdentifier(`worklet_${workletHash}_init_data`);
      const initDataObjectExpression = (0, types_1.objectExpression)([
        (0, types_1.objectProperty)((0, types_1.identifier)("code"), (0, types_1.stringLiteral)(funString)),
        (0, types_1.objectProperty)((0, types_1.identifier)("location"), (0, types_1.stringLiteral)(location))
      ]);
      if (sourceMapString) {
        initDataObjectExpression.properties.push((0, types_1.objectProperty)((0, types_1.identifier)("sourceMap"), (0, types_1.stringLiteral)(sourceMapString)));
      }
      pathForStringDefinitions.insertBefore((0, types_1.variableDeclaration)("const", [
        (0, types_1.variableDeclarator)(initDataId, initDataObjectExpression)
      ]));
      (0, assert_1.strict)(!(0, types_1.isFunctionDeclaration)(funExpression), "'funExpression' is a 'FunctionDeclaration'");
      (0, assert_1.strict)(!(0, types_1.isObjectMethod)(funExpression), "'funExpression' is an 'ObjectMethod'");
      const statements = [
        (0, types_1.variableDeclaration)("const", [
          (0, types_1.variableDeclarator)(privateFunctionId, funExpression)
        ]),
        (0, types_1.expressionStatement)((0, types_1.assignmentExpression)("=", (0, types_1.memberExpression)(privateFunctionId, (0, types_1.identifier)("_closure"), false), (0, types_1.objectExpression)(variables.map((variable) => (0, types_1.objectProperty)((0, types_1.identifier)(variable.name), variable, false, true))))),
        (0, types_1.expressionStatement)((0, types_1.assignmentExpression)("=", (0, types_1.memberExpression)(privateFunctionId, (0, types_1.identifier)("__initData"), false), initDataId)),
        (0, types_1.expressionStatement)((0, types_1.assignmentExpression)("=", (0, types_1.memberExpression)(privateFunctionId, (0, types_1.identifier)("__workletHash"), false), (0, types_1.numericLiteral)(workletHash)))
      ];
      if (!(0, utils_1.isRelease)()) {
        statements.unshift((0, types_1.variableDeclaration)("const", [
          (0, types_1.variableDeclarator)((0, types_1.identifier)("_e"), (0, types_1.arrayExpression)([
            (0, types_1.newExpression)((0, types_1.memberExpression)((0, types_1.identifier)("global"), (0, types_1.identifier)("Error")), []),
            (0, types_1.numericLiteral)(lineOffset),
            (0, types_1.numericLiteral)(-27)
          ]))
        ]));
        statements.push((0, types_1.expressionStatement)((0, types_1.assignmentExpression)("=", (0, types_1.memberExpression)(privateFunctionId, (0, types_1.identifier)("__stackDetails"), false), (0, types_1.identifier)("_e"))));
        if (shouldInjectVersion()) {
          statements.push((0, types_1.expressionStatement)((0, types_1.assignmentExpression)("=", (0, types_1.memberExpression)(privateFunctionId, (0, types_1.identifier)("__version"), false), (0, types_1.stringLiteral)(version))));
        }
      }
      statements.push((0, types_1.returnStatement)(privateFunctionId));
      const newFun = (0, types_1.functionExpression)(void 0, [], (0, types_1.blockStatement)(statements));
      return newFun;
    }
    exports2.makeWorklet = makeWorklet;
    function shouldInjectVersion() {
      if ((0, utils_1.isRelease)()) {
        return false;
      }
      if (process.env.REANIMATED_JEST_DISABLE_VERSION === "jest") {
        return false;
      }
      return true;
    }
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
    function makeWorkletName(fun) {
      if ((0, types_1.isObjectMethod)(fun.node) && "name" in fun.node.key) {
        return fun.node.key.name;
      }
      if ((0, types_1.isFunctionDeclaration)(fun.node) && fun.node.id) {
        return fun.node.id.name;
      }
      if ((0, types_1.isFunctionExpression)(fun.node) && (0, types_1.isIdentifier)(fun.node.id)) {
        return fun.node.id.name;
      }
      return "anonymous";
    }
    function makeArrayFromCapturedBindings(ast, fun) {
      const closure = /* @__PURE__ */ new Map();
      (0, core_1.traverse)(ast, {
        Identifier(path) {
          if (!path.isReferencedIdentifier()) {
            return;
          }
          const name = path.node.name;
          if (commonObjects_12.globals.has(name)) {
            return;
          }
          if ("id" in fun.node && fun.node.id && fun.node.id.name === name) {
            return;
          }
          const parentNode = path.parent;
          if ((0, types_1.isMemberExpression)(parentNode) && parentNode.property === path.node && !parentNode.computed) {
            return;
          }
          if ((0, types_1.isObjectProperty)(parentNode) && (0, types_1.isObjectExpression)(path.parentPath.parent) && path.node !== parentNode.value) {
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
      return Array.from(closure.values());
    }
  }
});

// lib/processWorkletObjectMethod.js
var require_processWorkletObjectMethod = __commonJS({
  "lib/processWorkletObjectMethod.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processWorkletObjectMethod = void 0;
    var types_1 = require("@babel/types");
    var makeWorklet_1 = require_makeWorklet();
    function processWorkletObjectMethod(path, state) {
      if (!(0, types_1.isFunctionParent)(path)) {
        return;
      }
      const newFun = (0, makeWorklet_1.makeWorklet)(path, state);
      const replacement = (0, types_1.objectProperty)((0, types_1.identifier)((0, types_1.isIdentifier)(path.node.key) ? path.node.key.name : ""), (0, types_1.callExpression)(newFun, []));
      path.replaceWith(replacement);
    }
    exports2.processWorkletObjectMethod = processWorkletObjectMethod;
  }
});

// lib/processIfWorkletFunction.js
var require_processIfWorkletFunction = __commonJS({
  "lib/processIfWorkletFunction.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processIfWorkletFunction = void 0;
    var types_1 = require("@babel/types");
    var makeWorklet_1 = require_makeWorklet();
    function processIfWorkletFunction(path, state) {
      if (path.isFunctionDeclaration() || path.isFunctionExpression() || path.isArrowFunctionExpression()) {
        processWorkletFunction(path, state);
      }
    }
    exports2.processIfWorkletFunction = processIfWorkletFunction;
    function processWorkletFunction(path, state) {
      const newFun = (0, makeWorklet_1.makeWorklet)(path, state);
      const replacement = (0, types_1.callExpression)(newFun, []);
      const needDeclaration = (0, types_1.isScopable)(path.parent) || (0, types_1.isExportNamedDeclaration)(path.parent);
      path.replaceWith("id" in path.node && path.node.id && needDeclaration ? (0, types_1.variableDeclaration)("const", [
        (0, types_1.variableDeclarator)(path.node.id, replacement)
      ]) : replacement);
    }
  }
});

// lib/processForCalleesWorklets.js
var require_processForCalleesWorklets = __commonJS({
  "lib/processForCalleesWorklets.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processForCalleesWorklets = void 0;
    var types_1 = require("@babel/types");
    var processWorkletObjectMethod_1 = require_processWorkletObjectMethod();
    var processIfWorkletFunction_1 = require_processIfWorkletFunction();
    var assert_1 = require("assert");
    var functionArgsToWorkletize = /* @__PURE__ */ new Map([
      ["useFrameCallback", [0]],
      ["useAnimatedStyle", [0]],
      ["useAnimatedProps", [0]],
      ["createAnimatedPropAdapter", [0]],
      ["useDerivedValue", [0]],
      ["useAnimatedScrollHandler", [0]],
      ["useAnimatedReaction", [0, 1]],
      ["useWorkletCallback", [0]],
      ["withTiming", [2]],
      ["withSpring", [2]],
      ["withDecay", [1]],
      ["withRepeat", [3]],
      ["runOnUI", [0]]
    ]);
    var objectHooks = /* @__PURE__ */ new Set([
      "useAnimatedGestureHandler",
      "useAnimatedScrollHandler"
    ]);
    function processForCalleesWorklets(path, state) {
      const callee = (0, types_1.isSequenceExpression)(path.node.callee) ? path.node.callee.expressions[path.node.callee.expressions.length - 1] : path.node.callee;
      const name = "name" in callee ? callee.name : "property" in callee && "name" in callee.property ? callee.property.name : void 0;
      if (name === void 0) {
        return;
      }
      if (objectHooks.has(name)) {
        const workletToProcess = path.get("arguments.0");
        (0, assert_1.strict)(!Array.isArray(workletToProcess), "'workletToProcess' is an array'");
        if (workletToProcess.isObjectExpression()) {
          processObjectHook(workletToProcess, state);
        } else if (name === "useAnimatedScrollHandler") {
          (0, processIfWorkletFunction_1.processIfWorkletFunction)(workletToProcess, state);
        }
      } else {
        const indices = functionArgsToWorkletize.get(name);
        if (indices === void 0) {
          return;
        }
        processArguments(path, indices, state);
      }
    }
    exports2.processForCalleesWorklets = processForCalleesWorklets;
    function processObjectHook(path, state) {
      const properties = path.get("properties");
      for (const property of properties) {
        if (property.isObjectMethod()) {
          (0, processWorkletObjectMethod_1.processWorkletObjectMethod)(property, state);
        } else if (property.isObjectProperty()) {
          const value = property.get("value");
          (0, processIfWorkletFunction_1.processIfWorkletFunction)(value, state);
        } else {
          throw new Error(`'${property.type}' as to-be workletized arguments is not supported for object hooks`);
        }
      }
    }
    function processArguments(path, indices, state) {
      const argumentsArray = path.get("arguments");
      indices.forEach((index) => {
        const argumentToWorkletize = argumentsArray[index];
        if (!argumentToWorkletize) {
          return;
        }
        (0, processIfWorkletFunction_1.processIfWorkletFunction)(argumentToWorkletize, state);
      });
    }
  }
});

// lib/processIfWorkletNode.js
var require_processIfWorkletNode = __commonJS({
  "lib/processIfWorkletNode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processIfWorkletNode = void 0;
    var types_1 = require("@babel/types");
    var processIfWorkletFunction_1 = require_processIfWorkletFunction();
    function processIfWorkletNode(fun, state) {
      fun.traverse({
        DirectiveLiteral(path) {
          const value = path.node.value;
          if (value === "worklet" && path.getFunctionParent() === fun && (0, types_1.isBlockStatement)(fun.node.body)) {
            const directives = fun.node.body.directives;
            if (directives && directives.length > 0 && directives.some((directive) => (0, types_1.isDirectiveLiteral)(directive.value) && directive.value.value === "worklet")) {
              (0, processIfWorkletFunction_1.processIfWorkletFunction)(fun, state);
            }
          }
        }
      });
    }
    exports2.processIfWorkletNode = processIfWorkletNode;
  }
});

// lib/processIfGestureHandlerEventCallbackFunctionNode.js
var require_processIfGestureHandlerEventCallbackFunctionNode = __commonJS({
  "lib/processIfGestureHandlerEventCallbackFunctionNode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processIfGestureHandlerEventCallbackFunctionNode = void 0;
    var types_1 = require("@babel/types");
    var processIfWorkletFunction_1 = require_processIfWorkletFunction();
    var gestureHandlerGestureObjects = /* @__PURE__ */ new Set([
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
    var gestureHandlerBuilderMethods = /* @__PURE__ */ new Set([
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
    function processIfGestureHandlerEventCallbackFunctionNode(path, state) {
      if ((0, types_1.isCallExpression)(path.parent) && (0, types_1.isExpression)(path.parent.callee) && isGestureObjectEventCallbackMethod(path.parent.callee)) {
        (0, processIfWorkletFunction_1.processIfWorkletFunction)(path, state);
      }
    }
    exports2.processIfGestureHandlerEventCallbackFunctionNode = processIfGestureHandlerEventCallbackFunctionNode;
    function isGestureObjectEventCallbackMethod(exp) {
      return (0, types_1.isMemberExpression)(exp) && (0, types_1.isIdentifier)(exp.property) && gestureHandlerBuilderMethods.has(exp.property.name) && containsGestureObject(exp.object);
    }
    function containsGestureObject(exp) {
      if (isGestureObject(exp)) {
        return true;
      }
      if ((0, types_1.isCallExpression)(exp) && (0, types_1.isMemberExpression)(exp.callee) && containsGestureObject(exp.callee.object)) {
        return true;
      }
      return false;
    }
    function isGestureObject(exp) {
      return (0, types_1.isCallExpression)(exp) && (0, types_1.isMemberExpression)(exp.callee) && (0, types_1.isIdentifier)(exp.callee.object) && exp.callee.object.name === "Gesture" && (0, types_1.isIdentifier)(exp.callee.property) && gestureHandlerGestureObjects.has(exp.callee.property.name);
    }
  }
});

// lib/processInlineStylesWarning.js
var require_processInlineStylesWarning = __commonJS({
  "lib/processInlineStylesWarning.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processInlineStylesWarning = void 0;
    var types_1 = require("@babel/types");
    var utils_1 = require_utils();
    var assert_1 = require("assert");
    function generateInlineStylesWarning(path) {
      return (0, types_1.callExpression)((0, types_1.arrowFunctionExpression)([], (0, types_1.blockStatement)([
        (0, types_1.expressionStatement)((0, types_1.callExpression)((0, types_1.memberExpression)((0, types_1.identifier)("console"), (0, types_1.identifier)("warn")), [
          (0, types_1.callExpression)((0, types_1.memberExpression)((0, types_1.callExpression)((0, types_1.identifier)("require"), [
            (0, types_1.stringLiteral)("react-native-reanimated")
          ]), (0, types_1.identifier)("getUseOfValueInStyleWarning")), [])
        ])),
        (0, types_1.returnStatement)(path.node)
      ])), []);
    }
    function processPropertyValueForInlineStylesWarning(path) {
      if (path.isMemberExpression() && (0, types_1.isIdentifier)(path.node.property)) {
        if (path.node.property.name === "value") {
          path.replaceWith(generateInlineStylesWarning(path));
        }
      }
    }
    function processTransformPropertyForInlineStylesWarning(path) {
      if ((0, types_1.isArrayExpression)(path.node)) {
        const elements = path.get("elements");
        (0, assert_1.strict)(Array.isArray(elements), "'elements' should be an array");
        for (const element of elements) {
          if (element.isObjectExpression()) {
            processStyleObjectForInlineStylesWarning(element);
          }
        }
      }
    }
    function processStyleObjectForInlineStylesWarning(path) {
      const properties = path.get("properties");
      for (const property of properties) {
        if (property.isObjectProperty()) {
          const value = property.get("value");
          if ((0, types_1.isIdentifier)(property.node.key) && property.node.key.name === "transform") {
            processTransformPropertyForInlineStylesWarning(value);
          } else {
            processPropertyValueForInlineStylesWarning(value);
          }
        }
      }
    }
    function processInlineStylesWarning(path, state) {
      if ((0, utils_1.isRelease)()) {
        return;
      }
      if (state.opts.disableInlineStylesWarning) {
        return;
      }
      if (path.node.name.name !== "style") {
        return;
      }
      if (!(0, types_1.isJSXExpressionContainer)(path.node.value)) {
        return;
      }
      const expression = path.get("value").get("expression");
      (0, assert_1.strict)(!Array.isArray(expression), "'expression' should not be an array");
      if (expression.isArrayExpression()) {
        const elements = expression.get("elements");
        (0, assert_1.strict)(Array.isArray(elements), "'elements' should be an array");
        for (const element of elements) {
          if (element.isObjectExpression()) {
            processStyleObjectForInlineStylesWarning(element);
          }
        }
      } else if (expression.isObjectExpression()) {
        processStyleObjectForInlineStylesWarning(expression);
      }
    }
    exports2.processInlineStylesWarning = processInlineStylesWarning;
  }
});

// lib/plugin.js
Object.defineProperty(exports, "__esModule", { value: true });
var commonObjects_1 = require_commonObjects();
var processForCalleesWorklets_1 = require_processForCalleesWorklets();
var processIfWorkletNode_1 = require_processIfWorkletNode();
var processIfGestureHandlerEventCallbackFunctionNode_1 = require_processIfGestureHandlerEventCallbackFunctionNode();
var processInlineStylesWarning_1 = require_processInlineStylesWarning();
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
//# sourceMappingURL=plugin.js.map
