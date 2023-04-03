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

// lib/makeWorklet.js
var require_makeWorklet = __commonJS({
  "lib/makeWorklet.js"(exports2) {
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
    exports2.makeWorklet = void 0;
    var core_1 = require("@babel/core");
    var generator_1 = __importDefault(require("@babel/generator"));
    var types_1 = require("@babel/types");
    var fs = __importStar(require("fs"));
    var convertSourceMap = __importStar(require("convert-source-map"));
    var utils_1 = require_utils();
    var commonObjects_12 = require_commonObjects();
    var assert_1 = require("assert");
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
    function shouldGenerateSourceMap() {
      if ((0, utils_1.isRelease)()) {
        return false;
      }
      if (process.env.REANIMATED_PLUGIN_TESTS === "jest") {
        return false;
      }
      return true;
    }
    function buildWorkletString(fun, closureVariables, name, inputMap) {
      function prependClosureVariablesIfNecessary() {
        const closureDeclaration = (0, types_1.variableDeclaration)("const", [
          (0, types_1.variableDeclarator)((0, types_1.objectPattern)(closureVariables.map((variable) => (0, types_1.objectProperty)((0, types_1.identifier)(variable.name), (0, types_1.identifier)(variable.name), false, true))), (0, types_1.memberExpression)((0, types_1.thisExpression)(), (0, types_1.identifier)("_closure")))
        ]);
        function prependClosure(path) {
          if (closureVariables.length === 0 || path.parent.type !== "Program") {
            return;
          }
          if (!(0, types_1.isExpression)(path.node.body)) {
            path.node.body.body.unshift(closureDeclaration);
          }
        }
        function prependRecursiveDeclaration(path) {
          var _a;
          if (path.parent.type === "Program" && !(0, types_1.isArrowFunctionExpression)(path.node) && !(0, types_1.isObjectMethod)(path.node) && path.node.id && path.scope.parent) {
            const hasRecursiveCalls = ((_a = path.scope.parent.bindings[path.node.id.name]) === null || _a === void 0 ? void 0 : _a.references) > 0;
            if (hasRecursiveCalls) {
              path.node.body.body.unshift((0, types_1.variableDeclaration)("const", [
                (0, types_1.variableDeclarator)((0, types_1.identifier)(path.node.id.name), (0, types_1.memberExpression)((0, types_1.thisExpression)(), (0, types_1.identifier)("_recur")))
              ]));
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
      const draftExpression = fun.program.body.find((obj) => (0, types_1.isFunctionDeclaration)(obj)) || fun.program.body.find((obj) => (0, types_1.isExpressionStatement)(obj)) || void 0;
      (0, assert_1.strict)(draftExpression, "'draftExpression' is undefined");
      const expression = (0, types_1.isFunctionDeclaration)(draftExpression) ? draftExpression : draftExpression.expression;
      (0, assert_1.strict)("params" in expression, "'params' property is undefined in 'expression'");
      (0, assert_1.strict)((0, types_1.isBlockStatement)(expression.body), "'expression.body' is not a 'blockStatement'");
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
        plugins: [prependClosureVariablesIfNecessary()],
        compact: !includeSourceMap,
        sourceMaps: includeSourceMap,
        inputSourceMap: inputMap,
        ast: false,
        babelrc: false,
        configFile: false,
        comments: false
      });
      (0, assert_1.strict)(transformed, "'transformed' is undefined");
      let sourceMap;
      if (includeSourceMap) {
        sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
        delete sourceMap.sourcesContent;
      }
      return [transformed.code, JSON.stringify(sourceMap)];
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
      (0, assert_1.strict)(state.file.opts.filename, "'state.file.opts.filename' is undefined");
      const codeObject = (0, generator_1.default)(fun.node, {
        sourceMaps: true,
        sourceFileName: state.file.opts.filename
      });
      const code = "(" + ((0, types_1.isObjectMethod)(fun) ? "function " : "") + codeObject.code + "\n)";
      const transformed = (0, core_1.transformSync)(code, {
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
      (0, core_1.traverse)(transformed.ast, {
        Identifier(path) {
          if (!path.isReferencedIdentifier()) {
            return;
          }
          const name = path.node.name;
          if (commonObjects_12.globals.has(name) || !(0, types_1.isArrowFunctionExpression)(fun.node) && !(0, types_1.isObjectMethod)(fun.node) && fun.node.id && fun.node.id.name === name) {
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
      const privateFunctionId = (0, types_1.identifier)("_f");
      const clone = (0, types_1.cloneNode)(fun.node);
      const funExpression = (0, types_1.isBlockStatement)(clone.body) ? (0, types_1.functionExpression)(null, clone.params, clone.body) : clone;
      const [funString, sourceMapString] = buildWorkletString(transformed.ast, variables, functionName, transformed.map);
      (0, assert_1.strict)(funString, "'funString' is undefined");
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
      const pathForStringDefinitions = fun.parentPath.isProgram() ? fun : fun.findParent((path) => path.parentPath.isProgram());
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
      (0, assert_1.strict)(!(0, types_1.isFunctionDeclaration)(funExpression), "'funExpression' is a 'functionDeclaration'");
      (0, assert_1.strict)(!(0, types_1.isObjectMethod)(funExpression), "'funExpression' is an 'objectMethod'");
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
      }
      statements.push((0, types_1.returnStatement)(privateFunctionId));
      const newFun = (0, types_1.functionExpression)(void 0, [], (0, types_1.blockStatement)(statements));
      return newFun;
    }
    exports2.makeWorklet = makeWorklet;
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

// lib/processWorkletFunction.js
var require_processWorkletFunction = __commonJS({
  "lib/processWorkletFunction.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processWorkletFunction = void 0;
    var types_1 = require("@babel/types");
    var makeWorklet_1 = require_makeWorklet();
    function processWorkletFunction(fun, state) {
      if (!(0, types_1.isFunctionParent)(fun)) {
        return;
      }
      const newFun = (0, makeWorklet_1.makeWorklet)(fun, state);
      const replacement = (0, types_1.callExpression)(newFun, []);
      const needDeclaration = (0, types_1.isScopable)(fun.parent) || (0, types_1.isExportNamedDeclaration)(fun.parent);
      fun.replaceWith(!(0, types_1.isArrowFunctionExpression)(fun.node) && fun.node.id && needDeclaration ? (0, types_1.variableDeclaration)("const", [
        (0, types_1.variableDeclarator)(fun.node.id, replacement)
      ]) : replacement);
    }
    exports2.processWorkletFunction = processWorkletFunction;
  }
});

// lib/processWorklets.js
var require_processWorklets = __commonJS({
  "lib/processWorklets.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processWorklets = void 0;
    var types_1 = require("@babel/types");
    var processWorkletObjectMethod_1 = require_processWorkletObjectMethod();
    var processWorkletFunction_1 = require_processWorkletFunction();
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
      ["withRepeat", [3]]
    ]);
    var objectHooks = /* @__PURE__ */ new Set([
      "useAnimatedGestureHandler",
      "useAnimatedScrollHandler"
    ]);
    function processWorklets(path, state) {
      const callee = (0, types_1.isSequenceExpression)(path.node.callee) ? path.node.callee.expressions[path.node.callee.expressions.length - 1] : path.node.callee;
      let name = "";
      if ("name" in callee) {
        name = callee.name;
      } else if ("property" in callee && "name" in callee.property) {
        name = callee.property.name;
      }
      if (objectHooks.has(name) && (0, types_1.isObjectExpression)(path.get("arguments.0").node)) {
        const properties = path.get("arguments.0.properties");
        for (const property of properties) {
          if ((0, types_1.isObjectMethod)(property.node)) {
            (0, processWorkletObjectMethod_1.processWorkletObjectMethod)(property, state);
          } else {
            const value = property.get("value");
            (0, processWorkletFunction_1.processWorkletFunction)(value, state);
          }
        }
      } else {
        const indexes = functionArgsToWorkletize.get(name);
        if (Array.isArray(indexes)) {
          indexes.forEach((index) => {
            (0, processWorkletFunction_1.processWorkletFunction)(path.get(`arguments.${index}`), state);
          });
        }
      }
    }
    exports2.processWorklets = processWorklets;
  }
});

// lib/processIfWorkletNode.js
var require_processIfWorkletNode = __commonJS({
  "lib/processIfWorkletNode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processIfWorkletNode = void 0;
    var types_1 = require("@babel/types");
    var processWorkletFunction_1 = require_processWorkletFunction();
    function processIfWorkletNode(fun, state) {
      fun.traverse({
        DirectiveLiteral(path) {
          const value = path.node.value;
          if (value === "worklet" && path.getFunctionParent() === fun && (0, types_1.isBlockStatement)(fun.node.body)) {
            const directives = fun.node.body.directives;
            if (directives && directives.length > 0 && directives.some((directive) => (0, types_1.isDirectiveLiteral)(directive.value) && directive.value.value === "worklet")) {
              (0, processWorkletFunction_1.processWorkletFunction)(fun, state);
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
    var processWorkletFunction_1 = require_processWorkletFunction();
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
    function processIfGestureHandlerEventCallbackFunctionNode(fun, state) {
      if ((0, types_1.isCallExpression)(fun.parent) && (0, types_1.isExpression)(fun.parent.callee) && isGestureObjectEventCallbackMethod(fun.parent.callee)) {
        (0, processWorkletFunction_1.processWorkletFunction)(fun, state);
      }
    }
    exports2.processIfGestureHandlerEventCallbackFunctionNode = processIfGestureHandlerEventCallbackFunctionNode;
    function isGestureObjectEventCallbackMethod(node) {
      return (0, types_1.isMemberExpression)(node) && (0, types_1.isIdentifier)(node.property) && gestureHandlerBuilderMethods.has(node.property.name) && containsGestureObject(node.object);
    }
    function containsGestureObject(node) {
      if (isGestureObject(node)) {
        return true;
      }
      if ((0, types_1.isCallExpression)(node) && (0, types_1.isMemberExpression)(node.callee) && containsGestureObject(node.callee.object)) {
        return true;
      }
      return false;
    }
    function isGestureObject(node) {
      return (0, types_1.isCallExpression)(node) && (0, types_1.isMemberExpression)(node.callee) && (0, types_1.isIdentifier)(node.callee.object) && node.callee.object.name === "Gesture" && (0, types_1.isIdentifier)(node.callee.property) && gestureHandlerGestureObjects.has(node.callee.property.name);
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
      if ((0, types_1.isMemberExpression)(path.node) && (0, types_1.isIdentifier)(path.node.property)) {
        if (path.node.property.name === "value") {
          path.replaceWith(generateInlineStylesWarning(path));
        }
      }
    }
    function processTransformPropertyForInlineStylesWarning(path) {
      if ((0, types_1.isArrayExpression)(path.node)) {
        const elements = path.get("elements");
        for (const element of elements) {
          if ((0, types_1.isObjectExpression)(element.node)) {
            processStyleObjectForInlineStylesWarning(element);
          }
        }
      }
    }
    function processStyleObjectForInlineStylesWarning(path) {
      const properties = path.get("properties");
      for (const property of properties) {
        if (!(0, types_1.isObjectProperty)(property.node)) {
          continue;
        }
        const value = property.get("value");
        if ((0, types_1.isObjectProperty)(property)) {
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
      if ((0, types_1.isArrayExpression)(expression.node)) {
        const elements = expression.get("elements");
        for (const element of elements) {
          if ((0, types_1.isObjectExpression)(element.node)) {
            processStyleObjectForInlineStylesWarning(element);
          }
        }
      } else if ((0, types_1.isObjectExpression)(expression.node)) {
        processStyleObjectForInlineStylesWarning(expression);
      }
    }
    exports2.processInlineStylesWarning = processInlineStylesWarning;
  }
});

// lib/injectVersion.js
var require_injectVersion = __commonJS({
  "lib/injectVersion.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.injectVersion = void 0;
    var types_1 = require("@babel/types");
    function injectVersion(path) {
      if (path.node.value !== "inject Reanimated Babel plugin version") {
        return;
      }
      const injectedName = "_REANIMATED_VERSION_BABEL_PLUGIN";
      const versionString = require("../../package.json").version;
      const pluginVersionNode = (0, types_1.expressionStatement)((0, types_1.assignmentExpression)("=", (0, types_1.memberExpression)((0, types_1.identifier)("global"), (0, types_1.identifier)(injectedName)), (0, types_1.stringLiteral)(versionString)));
      const functionParent = path.getFunctionParent().node;
      functionParent.body.directives = [];
      functionParent.body.body.unshift(pluginVersionNode);
    }
    exports2.injectVersion = injectVersion;
  }
});

// lib/plugin.js
Object.defineProperty(exports, "__esModule", { value: true });
var commonObjects_1 = require_commonObjects();
var processWorklets_1 = require_processWorklets();
var processIfWorkletNode_1 = require_processIfWorkletNode();
var processIfGestureHandlerEventCallbackFunctionNode_1 = require_processIfGestureHandlerEventCallbackFunctionNode();
var processInlineStylesWarning_1 = require_processInlineStylesWarning();
var injectVersion_1 = require_injectVersion();
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
      DirectiveLiteral: {
        enter(path) {
          (0, injectVersion_1.injectVersion)(path);
        }
      },
      CallExpression: {
        enter(path, state) {
          (0, processWorklets_1.processWorklets)(path, state);
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
