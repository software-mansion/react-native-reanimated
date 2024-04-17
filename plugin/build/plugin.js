"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

// lib/types.js
var require_types = __commonJS({
  "lib/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isWorkletizableFunctionType = exports2.WorkletizableFunction = void 0;
    exports2.WorkletizableFunction = "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod";
    function isWorkletizableFunctionType(path) {
      return path.isFunctionDeclaration() || path.isFunctionExpression() || path.isArrowFunctionExpression() || path.isObjectMethod();
    }
    exports2.isWorkletizableFunctionType = isWorkletizableFunctionType;
  }
});

// lib/globals.js
var require_globals = __commonJS({
  "lib/globals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.initializeGlobals = exports2.globals = exports2.defaultGlobals = void 0;
    var notCapturedIdentifiers = [
      "globalThis",
      "Infinity",
      "NaN",
      "undefined",
      "eval",
      "isFinite",
      "isNaN",
      "parseFloat",
      "parseInt",
      "decodeURI",
      "decodeURIComponent",
      "encodeURI",
      "encodeURIComponent",
      "escape",
      "unescape",
      "Object",
      "Function",
      "Boolean",
      "Symbol",
      "Error",
      "AggregateError",
      "EvalError",
      "RangeError",
      "ReferenceError",
      "SyntaxError",
      "TypeError",
      "URIError",
      "InternalError",
      "Number",
      "BigInt",
      "Math",
      "Date",
      "String",
      "RegExp",
      "Array",
      "Int8Array",
      "Uint8Array",
      "Uint8ClampedArray",
      "Int16Array",
      "Uint16Array",
      "Int32Array",
      "Uint32Array",
      "BigInt64Array",
      "BigUint64Array",
      "Float32Array",
      "Float64Array",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
      "ArrayBuffer",
      "SharedArrayBuffer",
      "DataView",
      "Atomics",
      "JSON",
      "WeakRef",
      "FinalizationRegistry",
      "Iterator",
      "AsyncIterator",
      "Promise",
      "GeneratorFunction",
      "AsyncGeneratorFunction",
      "Generator",
      "AsyncGenerator",
      "AsyncFunction",
      "Reflect",
      "Proxy",
      "Intl",
      "null",
      "this",
      "global",
      "console",
      "performance",
      "queueMicrotask",
      "requestAnimationFrame",
      "setImmediate",
      "arguments",
      "HermesInternal",
      "_WORKLET"
    ];
    var notCapturedIdentifiers_DEPRECATED = [
      "_IS_FABRIC",
      "_log",
      "_toString",
      "_scheduleOnJS",
      "_scheduleOnRuntime",
      "_makeShareableClone",
      "_updatePropsPaper",
      "_updatePropsFabric",
      "_removeFromPropsRegistry",
      "_measurePaper",
      "_measureFabric",
      "_scrollToPaper",
      "_dispatchCommandPaper",
      "_dispatchCommandFabric",
      "_setGestureState",
      "_notifyAboutProgress",
      "_notifyAboutEnd",
      "_runOnUIQueue",
      "_getAnimationTimestamp"
    ];
    exports2.defaultGlobals = new Set(notCapturedIdentifiers.concat(notCapturedIdentifiers_DEPRECATED));
    function initializeGlobals() {
      exports2.globals = new Set(exports2.defaultGlobals);
    }
    exports2.initializeGlobals = initializeGlobals;
  }
});

// lib/utils.js
var require_utils = __commonJS({
  "lib/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.addCustomGlobals = exports2.isRelease = void 0;
    var globals_12 = require_globals();
    function isRelease() {
      var _a, _b;
      const pattern = /(prod|release|stag[ei])/i;
      return !!(((_a = process.env.BABEL_ENV) === null || _a === void 0 ? void 0 : _a.match(pattern)) || ((_b = process.env.NODE_ENV) === null || _b === void 0 ? void 0 : _b.match(pattern)));
    }
    exports2.isRelease = isRelease;
    function addCustomGlobals() {
      if (this.opts && Array.isArray(this.opts.globals)) {
        this.opts.globals.forEach((name) => {
          globals_12.globals.add(name);
        });
      }
    }
    exports2.addCustomGlobals = addCustomGlobals;
  }
});

// lib/workletStringCode.js
var require_workletStringCode = __commonJS({
  "lib/workletStringCode.js"(exports2) {
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
    var types_12 = require("@babel/types");
    var assert_1 = require("assert");
    var convertSourceMap = __importStar(require("convert-source-map"));
    var fs = __importStar(require("fs"));
    var utils_12 = require_utils();
    var MOCK_SOURCE_MAP = "mock source map";
    function buildWorkletString(fun, closureVariables, name, inputMap) {
      const draftExpression = fun.program.body.find((obj) => (0, types_12.isFunctionDeclaration)(obj)) || fun.program.body.find((obj) => (0, types_12.isExpressionStatement)(obj)) || void 0;
      (0, assert_1.strict)(draftExpression, "[Reanimated] `draftExpression` is undefined.");
      const expression = (0, types_12.isFunctionDeclaration)(draftExpression) ? draftExpression : draftExpression.expression;
      (0, assert_1.strict)("params" in expression, "'params' property is undefined in 'expression'");
      (0, assert_1.strict)((0, types_12.isBlockStatement)(expression.body), "[Reanimated] `expression.body` is not a `BlockStatement`");
      const workletFunction = (0, types_12.functionExpression)((0, types_12.identifier)(name), expression.params, expression.body, expression.generator, expression.async);
      const code = (0, generator_1.default)(workletFunction).code;
      (0, assert_1.strict)(inputMap, "[Reanimated] `inputMap` is undefined.");
      const includeSourceMap = !(0, utils_12.isRelease)();
      if (includeSourceMap) {
        inputMap.sourcesContent = [];
        for (const sourceFile of inputMap.sources) {
          inputMap.sourcesContent.push(fs.readFileSync(sourceFile).toString("utf-8"));
        }
      }
      const transformed = (0, core_1.transformSync)(code, {
        plugins: [prependClosureVariablesIfNecessary(closureVariables)],
        compact: true,
        sourceMaps: includeSourceMap,
        inputSourceMap: inputMap,
        ast: false,
        babelrc: false,
        configFile: false,
        comments: false
      });
      (0, assert_1.strict)(transformed, "[Reanimated] `transformed` is null.");
      let sourceMap;
      if (includeSourceMap) {
        if (shouldMockSourceMap()) {
          sourceMap = MOCK_SOURCE_MAP;
        } else {
          sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
          delete sourceMap.sourcesContent;
        }
      }
      return [transformed.code, JSON.stringify(sourceMap)];
    }
    exports2.buildWorkletString = buildWorkletString;
    function shouldMockSourceMap() {
      return process.env.REANIMATED_JEST_SHOULD_MOCK_SOURCE_MAP === "1";
    }
    function prependClosure(path, closureVariables, closureDeclaration) {
      if (closureVariables.length === 0 || !(0, types_12.isProgram)(path.parent)) {
        return;
      }
      if (!(0, types_12.isExpression)(path.node.body)) {
        path.node.body.body.unshift(closureDeclaration);
      }
    }
    function prependRecursiveDeclaration(path) {
      var _a;
      if ((0, types_12.isProgram)(path.parent) && !(0, types_12.isArrowFunctionExpression)(path.node) && !(0, types_12.isObjectMethod)(path.node) && path.node.id && path.scope.parent) {
        const hasRecursiveCalls = ((_a = path.scope.parent.bindings[path.node.id.name]) === null || _a === void 0 ? void 0 : _a.references) > 0;
        if (hasRecursiveCalls) {
          path.node.body.body.unshift((0, types_12.variableDeclaration)("const", [
            (0, types_12.variableDeclarator)((0, types_12.identifier)(path.node.id.name), (0, types_12.memberExpression)((0, types_12.thisExpression)(), (0, types_12.identifier)("_recur")))
          ]));
        }
      }
    }
    function prependClosureVariablesIfNecessary(closureVariables) {
      const closureDeclaration = (0, types_12.variableDeclaration)("const", [
        (0, types_12.variableDeclarator)((0, types_12.objectPattern)(closureVariables.map((variable) => (0, types_12.objectProperty)((0, types_12.identifier)(variable.name), (0, types_12.identifier)(variable.name), false, true))), (0, types_12.memberExpression)((0, types_12.thisExpression)(), (0, types_12.identifier)("__closure")))
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

// lib/workletFactory.js
var require_workletFactory = __commonJS({
  "lib/workletFactory.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeWorkletFactory = void 0;
    var core_1 = require("@babel/core");
    var generator_1 = __importDefault(require("@babel/generator"));
    var types_12 = require("@babel/types");
    var assert_1 = require("assert");
    var path_1 = require("path");
    var workletStringCode_1 = require_workletStringCode();
    var globals_12 = require_globals();
    var utils_12 = require_utils();
    var REAL_VERSION = require("../../package.json").version;
    var MOCK_VERSION = "x.y.z";
    var workletStringTransformPresets = [
      require.resolve("@babel/preset-typescript")
    ];
    var workletStringTransformPlugins = [
      require.resolve("@babel/plugin-transform-shorthand-properties"),
      require.resolve("@babel/plugin-transform-arrow-functions"),
      require.resolve("@babel/plugin-transform-optional-chaining"),
      require.resolve("@babel/plugin-transform-nullish-coalescing-operator"),
      [
        require.resolve("@babel/plugin-transform-template-literals"),
        { loose: true }
      ]
    ];
    function makeWorkletFactory(fun, state) {
      removeWorkletDirective(fun);
      (0, assert_1.strict)(state.file.opts.filename, "[Reanimated] `state.file.opts.filename` is undefined.");
      const codeObject = (0, generator_1.default)(fun.node, {
        sourceMaps: true,
        sourceFileName: state.file.opts.filename
      });
      codeObject.code = "(" + (fun.isObjectMethod() ? "function " : "") + codeObject.code + "\n)";
      const transformed = (0, core_1.transformSync)(codeObject.code, {
        filename: state.file.opts.filename,
        presets: workletStringTransformPresets,
        plugins: workletStringTransformPlugins,
        ast: true,
        babelrc: false,
        configFile: false,
        inputSourceMap: codeObject.map
      });
      (0, assert_1.strict)(transformed, "[Reanimated] `transformed` is undefined.");
      (0, assert_1.strict)(transformed.ast, "[Reanimated] `transformed.ast` is undefined.");
      const variables = makeArrayFromCapturedBindings(transformed.ast, fun);
      const functionName = makeWorkletName(fun);
      const functionIdentifier = (0, types_12.identifier)(functionName);
      const clone = (0, types_12.cloneNode)(fun.node);
      const funExpression = (0, types_12.isBlockStatement)(clone.body) ? (0, types_12.functionExpression)(null, clone.params, clone.body, clone.generator, clone.async) : clone;
      let [funString, sourceMapString] = (0, workletStringCode_1.buildWorkletString)(transformed.ast, variables, functionName, transformed.map);
      (0, assert_1.strict)(funString, "[Reanimated] `funString` is undefined.");
      const workletHash = hash(funString);
      let lineOffset = 1;
      if (variables.length > 0) {
        lineOffset -= variables.length + 2;
      }
      const pathForStringDefinitions = fun.parentPath.isProgram() ? fun : fun.findParent((path) => {
        var _a, _b;
        return (_b = (_a = path.parentPath) === null || _a === void 0 ? void 0 : _a.isProgram()) !== null && _b !== void 0 ? _b : false;
      });
      (0, assert_1.strict)(pathForStringDefinitions, "[Reanimated] `pathForStringDefinitions` is null.");
      (0, assert_1.strict)(pathForStringDefinitions.parentPath, "[Reanimated] `pathForStringDefinitions.parentPath` is null.");
      const initDataId = pathForStringDefinitions.parentPath.scope.generateUidIdentifier(`worklet_${workletHash}_init_data`);
      const initDataObjectExpression = (0, types_12.objectExpression)([
        (0, types_12.objectProperty)((0, types_12.identifier)("code"), (0, types_12.stringLiteral)(funString))
      ]);
      const shouldInjectLocation = !(0, utils_12.isRelease)();
      if (shouldInjectLocation) {
        let location = state.file.opts.filename;
        if (state.opts.relativeSourceLocation) {
          location = (0, path_1.relative)(state.cwd, location);
          sourceMapString = sourceMapString === null || sourceMapString === void 0 ? void 0 : sourceMapString.replace(state.file.opts.filename, location);
        }
        initDataObjectExpression.properties.push((0, types_12.objectProperty)((0, types_12.identifier)("location"), (0, types_12.stringLiteral)(location)));
      }
      if (sourceMapString) {
        initDataObjectExpression.properties.push((0, types_12.objectProperty)((0, types_12.identifier)("sourceMap"), (0, types_12.stringLiteral)(sourceMapString)));
      }
      const shouldInjectVersion = !(0, utils_12.isRelease)();
      if (shouldInjectVersion) {
        initDataObjectExpression.properties.push((0, types_12.objectProperty)((0, types_12.identifier)("version"), (0, types_12.stringLiteral)(shouldMockVersion() ? MOCK_VERSION : REAL_VERSION)));
      }
      const shouldIncludeInitData = !state.opts.omitNativeOnlyData;
      if (shouldIncludeInitData) {
        pathForStringDefinitions.insertBefore((0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)(initDataId, initDataObjectExpression)
        ]));
      }
      (0, assert_1.strict)(!(0, types_12.isFunctionDeclaration)(funExpression), "[Reanimated] `funExpression` is a `FunctionDeclaration`.");
      (0, assert_1.strict)(!(0, types_12.isObjectMethod)(funExpression), "[Reanimated] `funExpression` is an `ObjectMethod`.");
      const statements = [
        (0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)(functionIdentifier, funExpression)
        ]),
        (0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)(functionIdentifier, (0, types_12.identifier)("__closure"), false), (0, types_12.objectExpression)(variables.map((variable) => (0, types_12.objectProperty)((0, types_12.identifier)(variable.name), variable, false, true))))),
        (0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)(functionIdentifier, (0, types_12.identifier)("__workletHash"), false), (0, types_12.numericLiteral)(workletHash)))
      ];
      if (shouldIncludeInitData) {
        statements.push((0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)(functionIdentifier, (0, types_12.identifier)("__initData"), false), initDataId)));
      }
      if (!(0, utils_12.isRelease)()) {
        statements.unshift((0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)((0, types_12.identifier)("_e"), (0, types_12.arrayExpression)([
            (0, types_12.newExpression)((0, types_12.memberExpression)((0, types_12.identifier)("global"), (0, types_12.identifier)("Error")), []),
            (0, types_12.numericLiteral)(lineOffset),
            (0, types_12.numericLiteral)(-27)
          ]))
        ]));
        statements.push((0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)(functionIdentifier, (0, types_12.identifier)("__stackDetails"), false), (0, types_12.identifier)("_e"))));
      }
      statements.push((0, types_12.returnStatement)(functionIdentifier));
      const newFun = (0, types_12.functionExpression)(void 0, [], (0, types_12.blockStatement)(statements));
      return newFun;
    }
    exports2.makeWorkletFactory = makeWorkletFactory;
    function removeWorkletDirective(fun) {
      fun.traverse({
        DirectiveLiteral(path) {
          if (path.node.value === "worklet" && path.getFunctionParent() === fun) {
            path.parentPath.remove();
          }
        }
      });
    }
    function shouldMockVersion() {
      return process.env.REANIMATED_JEST_SHOULD_MOCK_VERSION === "1";
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
      if ((0, types_12.isObjectMethod)(fun.node) && (0, types_12.isIdentifier)(fun.node.key)) {
        return fun.node.key.name;
      }
      if ((0, types_12.isFunctionDeclaration)(fun.node) && (0, types_12.isIdentifier)(fun.node.id)) {
        return fun.node.id.name;
      }
      if ((0, types_12.isFunctionExpression)(fun.node) && (0, types_12.isIdentifier)(fun.node.id)) {
        return fun.node.id.name;
      }
      return "anonymous";
    }
    function makeArrayFromCapturedBindings(ast, fun) {
      const closure = /* @__PURE__ */ new Map();
      const isLocationAssignedMap = /* @__PURE__ */ new Map();
      (0, core_1.traverse)(ast, {
        Identifier(path) {
          if (!path.isReferencedIdentifier()) {
            return;
          }
          const name = path.node.name;
          if (globals_12.globals.has(name)) {
            return;
          }
          if ("id" in fun.node && fun.node.id && fun.node.id.name === name) {
            return;
          }
          const parentNode = path.parent;
          if ((0, types_12.isMemberExpression)(parentNode) && parentNode.property === path.node && !parentNode.computed) {
            return;
          }
          if ((0, types_12.isObjectProperty)(parentNode) && (0, types_12.isObjectExpression)(path.parentPath.parent) && path.node !== parentNode.value) {
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
          isLocationAssignedMap.set(name, false);
        }
      });
      fun.traverse({
        Identifier(path) {
          if (!path.isReferencedIdentifier()) {
            return;
          }
          const node = closure.get(path.node.name);
          if (!node || isLocationAssignedMap.get(path.node.name)) {
            return;
          }
          node.loc = path.node.loc;
          isLocationAssignedMap.set(path.node.name, true);
        }
      });
      return Array.from(closure.values());
    }
  }
});

// lib/workletFactoryCall.js
var require_workletFactoryCall = __commonJS({
  "lib/workletFactoryCall.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeWorkletFactoryCall = void 0;
    var types_12 = require("@babel/types");
    var workletFactory_1 = require_workletFactory();
    function makeWorkletFactoryCall(path, state) {
      const workletFactory = (0, workletFactory_1.makeWorkletFactory)(path, state);
      const workletFactoryCall = (0, types_12.callExpression)(workletFactory, []);
      addStackTraceDataToWorkletFactory(path, workletFactoryCall);
      const replacement = workletFactoryCall;
      return replacement;
    }
    exports2.makeWorkletFactoryCall = makeWorkletFactoryCall;
    function addStackTraceDataToWorkletFactory(path, workletFactoryCall) {
      const originalWorkletLocation = path.node.loc;
      if (originalWorkletLocation) {
        workletFactoryCall.callee.loc = {
          filename: originalWorkletLocation.filename,
          identifierName: originalWorkletLocation.identifierName,
          start: originalWorkletLocation.start,
          end: originalWorkletLocation.start
        };
      }
    }
  }
});

// lib/workletSubstitution.js
var require_workletSubstitution = __commonJS({
  "lib/workletSubstitution.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.maybeSubstituteFunctionDeclarationWithVariableDeclaration = exports2.substituteObjectMethodWithObjectProperty = exports2.processWorklet = exports2.processIfWithWorkletDirective = void 0;
    var types_12 = require("@babel/types");
    var workletFactoryCall_1 = require_workletFactoryCall();
    var types_2 = require_types();
    function processIfWithWorkletDirective(path, state) {
      if (!(0, types_12.isBlockStatement)(path.node.body)) {
        return false;
      }
      if (!hasWorkletDirective(path.node.body.directives)) {
        return false;
      }
      processWorklet(path, state);
      return true;
    }
    exports2.processIfWithWorkletDirective = processIfWithWorkletDirective;
    function processWorklet(path, state) {
      if (state.opts.processNestedWorklets) {
        path.traverse({
          [types_2.WorkletizableFunction](subPath, passedState) {
            processIfWithWorkletDirective(subPath, passedState);
          }
        }, state);
      }
      const workletFactoryCall = (0, workletFactoryCall_1.makeWorkletFactoryCall)(path, state);
      substituteWithWorkletFactoryCall(path, workletFactoryCall);
    }
    exports2.processWorklet = processWorklet;
    function hasWorkletDirective(directives) {
      return directives.some((directive) => (0, types_12.isDirectiveLiteral)(directive.value) && directive.value.value === "worklet");
    }
    function substituteWithWorkletFactoryCall(path, workletFactoryCall) {
      if (path.isObjectMethod()) {
        substituteObjectMethodWithObjectProperty(path, workletFactoryCall);
      } else if (path.isFunctionDeclaration()) {
        maybeSubstituteFunctionDeclarationWithVariableDeclaration(path, workletFactoryCall);
      } else {
        path.replaceWith(workletFactoryCall);
      }
    }
    function substituteObjectMethodWithObjectProperty(path, workletFactoryCall) {
      const replacement = (0, types_12.objectProperty)(path.node.key, workletFactoryCall);
      path.replaceWith(replacement);
    }
    exports2.substituteObjectMethodWithObjectProperty = substituteObjectMethodWithObjectProperty;
    function maybeSubstituteFunctionDeclarationWithVariableDeclaration(path, workletFactoryCall) {
      const needDeclaration = (0, types_12.isScopable)(path.parent) || (0, types_12.isExportNamedDeclaration)(path.parent);
      const replacement = "id" in path.node && path.node.id && needDeclaration ? (0, types_12.variableDeclaration)("const", [
        (0, types_12.variableDeclarator)(path.node.id, workletFactoryCall)
      ]) : workletFactoryCall;
      path.replaceWith(replacement);
    }
    exports2.maybeSubstituteFunctionDeclarationWithVariableDeclaration = maybeSubstituteFunctionDeclarationWithVariableDeclaration;
  }
});

// lib/gestureHandlerAutoworkletization.js
var require_gestureHandlerAutoworkletization = __commonJS({
  "lib/gestureHandlerAutoworkletization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isGestureHandlerEventCallback = void 0;
    var types_12 = require("@babel/types");
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
      "Exclusive",
      "Hover"
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
    function isGestureHandlerEventCallback(path) {
      return (0, types_12.isCallExpression)(path.parent) && (0, types_12.isExpression)(path.parent.callee) && isGestureObjectEventCallbackMethod(path.parent.callee);
    }
    exports2.isGestureHandlerEventCallback = isGestureHandlerEventCallback;
    function isGestureObjectEventCallbackMethod(exp) {
      return (0, types_12.isMemberExpression)(exp) && (0, types_12.isIdentifier)(exp.property) && gestureHandlerBuilderMethods.has(exp.property.name) && containsGestureObject(exp.object);
    }
    function containsGestureObject(exp) {
      if (isGestureObject(exp)) {
        return true;
      }
      if ((0, types_12.isCallExpression)(exp) && (0, types_12.isMemberExpression)(exp.callee) && containsGestureObject(exp.callee.object)) {
        return true;
      }
      return false;
    }
    function isGestureObject(exp) {
      return (0, types_12.isCallExpression)(exp) && (0, types_12.isMemberExpression)(exp.callee) && (0, types_12.isIdentifier)(exp.callee.object) && exp.callee.object.name === "Gesture" && (0, types_12.isIdentifier)(exp.callee.property) && gestureHandlerGestureObjects.has(exp.callee.property.name);
    }
  }
});

// lib/layoutAnimationAutoworkletization.js
var require_layoutAnimationAutoworkletization = __commonJS({
  "lib/layoutAnimationAutoworkletization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isLayoutAnimationCallback = void 0;
    var types_12 = require("@babel/types");
    var EntryExitAnimations = /* @__PURE__ */ new Set([
      "BounceIn",
      "BounceInDown",
      "BounceInLeft",
      "BounceInRight",
      "BounceInUp",
      "BounceOut",
      "BounceOutDown",
      "BounceOutLeft",
      "BounceOutRight",
      "BounceOutUp",
      "FadeIn",
      "FadeInDown",
      "FadeInLeft",
      "FadeInRight",
      "FadeInUp",
      "FadeOut",
      "FadeOutDown",
      "FadeOutLeft",
      "FadeOutRight",
      "FadeOutUp",
      "FlipInEasyX",
      "FlipInEasyY",
      "FlipInXDown",
      "FlipInXUp",
      "FlipInYLeft",
      "FlipInYRight",
      "FlipOutEasyX",
      "FlipOutEasyY",
      "FlipOutXDown",
      "FlipOutXUp",
      "FlipOutYLeft",
      "FlipOutYRight",
      "LightSpeedInLeft",
      "LightSpeedInRight",
      "LightSpeedOutLeft",
      "LightSpeedOutRight",
      "PinwheelIn",
      "PinwheelOut",
      "RollInLeft",
      "RollInRight",
      "RollOutLeft",
      "RollOutRight",
      "RotateInDownLeft",
      "RotateInDownRight",
      "RotateInUpLeft",
      "RotateInUpRight",
      "RotateOutDownLeft",
      "RotateOutDownRight",
      "RotateOutUpLeft",
      "RotateOutUpRight",
      "SlideInDown",
      "SlideInLeft",
      "SlideInRight",
      "SlideInUp",
      "SlideOutDown",
      "SlideOutLeft",
      "SlideOutRight",
      "SlideOutUp",
      "StretchInX",
      "StretchInY",
      "StretchOutX",
      "StretchOutY",
      "ZoomIn",
      "ZoomInDown",
      "ZoomInEasyDown",
      "ZoomInEasyUp",
      "ZoomInLeft",
      "ZoomInRight",
      "ZoomInRotate",
      "ZoomInUp",
      "ZoomOut",
      "ZoomOutDown",
      "ZoomOutEasyDown",
      "ZoomOutEasyUp",
      "ZoomOutLeft",
      "ZoomOutRight",
      "ZoomOutRotate",
      "ZoomOutUp"
    ]);
    var LayoutTransitions = /* @__PURE__ */ new Set([
      "Layout",
      "LinearTransition",
      "SequencedTransition",
      "FadingTransition",
      "JumpingTransition",
      "CurvedTransition",
      "EntryExitTransition"
    ]);
    var LayoutAnimations = /* @__PURE__ */ new Set([
      ...EntryExitAnimations,
      ...LayoutTransitions
    ]);
    var BaseAnimationsChainableMethods = /* @__PURE__ */ new Set([
      "build",
      "duration",
      "delay",
      "getDuration",
      "randomDelay",
      "getDelay",
      "getDelayFunction"
    ]);
    var ComplexAnimationsChainableMethods = /* @__PURE__ */ new Set([
      "easing",
      "rotate",
      "springify",
      "damping",
      "mass",
      "stiffness",
      "overshootClamping",
      "restDisplacementThreshold",
      "restSpeedThreshold",
      "withInitialValues",
      "getAnimationAndConfig"
    ]);
    var DefaultTransitionChainableMethods = /* @__PURE__ */ new Set([
      "easingX",
      "easingY",
      "easingWidth",
      "easingHeight",
      "entering",
      "exiting",
      "reverse"
    ]);
    var LayoutAnimationsChainableMethods = /* @__PURE__ */ new Set([
      ...BaseAnimationsChainableMethods,
      ...ComplexAnimationsChainableMethods,
      ...DefaultTransitionChainableMethods
    ]);
    var LayoutAnimationsCallbacks = /* @__PURE__ */ new Set(["withCallback"]);
    function isLayoutAnimationCallback(path) {
      return (0, types_12.isCallExpression)(path.parent) && (0, types_12.isExpression)(path.parent.callee) && isLayoutAnimationCallbackMethod(path.parent.callee);
    }
    exports2.isLayoutAnimationCallback = isLayoutAnimationCallback;
    function isLayoutAnimationCallbackMethod(exp) {
      return (0, types_12.isMemberExpression)(exp) && (0, types_12.isIdentifier)(exp.property) && LayoutAnimationsCallbacks.has(exp.property.name) && isLayoutAnimationsChainableOrNewOperator(exp.object);
    }
    function isLayoutAnimationsChainableOrNewOperator(exp) {
      if ((0, types_12.isIdentifier)(exp) && LayoutAnimations.has(exp.name)) {
        return true;
      } else if ((0, types_12.isNewExpression)(exp) && (0, types_12.isIdentifier)(exp.callee) && LayoutAnimations.has(exp.callee.name)) {
        return true;
      }
      if ((0, types_12.isCallExpression)(exp) && (0, types_12.isMemberExpression)(exp.callee) && (0, types_12.isIdentifier)(exp.callee.property) && LayoutAnimationsChainableMethods.has(exp.callee.property.name) && isLayoutAnimationsChainableOrNewOperator(exp.callee.object)) {
        return true;
      }
      return false;
    }
  }
});

// lib/autoworkletization.js
var require_autoworkletization = __commonJS({
  "lib/autoworkletization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processCalleesAutoworkletizableCallbacks = exports2.processIfAutoworkletizableCallback = void 0;
    var types_12 = require("@babel/types");
    var types_2 = require_types();
    var assert_1 = require("assert");
    var workletSubstitution_12 = require_workletSubstitution();
    var gestureHandlerAutoworkletization_1 = require_gestureHandlerAutoworkletization();
    var layoutAnimationAutoworkletization_1 = require_layoutAnimationAutoworkletization();
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
      ["runOnUI", [0]],
      ["executeOnUIRuntimeSync", [0]]
    ]);
    var objectHooks = /* @__PURE__ */ new Set([
      "useAnimatedGestureHandler",
      "useAnimatedScrollHandler"
    ]);
    function processIfAutoworkletizableCallback(path, state) {
      if ((0, gestureHandlerAutoworkletization_1.isGestureHandlerEventCallback)(path) || (0, layoutAnimationAutoworkletization_1.isLayoutAnimationCallback)(path)) {
        (0, workletSubstitution_12.processWorklet)(path, state);
        return true;
      }
      return false;
    }
    exports2.processIfAutoworkletizableCallback = processIfAutoworkletizableCallback;
    function processCalleesAutoworkletizableCallbacks(path, state) {
      const callee = (0, types_12.isSequenceExpression)(path.node.callee) ? path.node.callee.expressions[path.node.callee.expressions.length - 1] : path.node.callee;
      const name = "name" in callee ? callee.name : "property" in callee && "name" in callee.property ? callee.property.name : void 0;
      if (name === void 0) {
        return;
      }
      if (objectHooks.has(name)) {
        const maybeWorklet = path.get("arguments.0");
        (0, assert_1.strict)(!Array.isArray(maybeWorklet), "[Reanimated] `workletToProcess` is an array.");
        if (maybeWorklet.isObjectExpression()) {
          processObjectHook(maybeWorklet, state);
        } else if (name === "useAnimatedScrollHandler") {
          if ((0, types_2.isWorkletizableFunctionType)(maybeWorklet)) {
            (0, workletSubstitution_12.processWorklet)(maybeWorklet, state);
          }
        }
      } else {
        const indices = functionArgsToWorkletize.get(name);
        if (indices === void 0) {
          return;
        }
        processArguments(path, indices, state);
      }
    }
    exports2.processCalleesAutoworkletizableCallbacks = processCalleesAutoworkletizableCallbacks;
    function processObjectHook(path, state) {
      const properties = path.get("properties");
      for (const property of properties) {
        if (property.isObjectMethod()) {
          (0, workletSubstitution_12.processWorklet)(property, state);
        } else if (property.isObjectProperty()) {
          const value = property.get("value");
          if ((0, types_2.isWorkletizableFunctionType)(value)) {
            (0, workletSubstitution_12.processWorklet)(value, state);
          }
        } else {
          throw new Error(`[Reanimated] '${property.type}' as to-be workletized argument is not supported for object hooks.`);
        }
      }
    }
    function processArguments(path, indices, state) {
      const argumentsArray = path.get("arguments");
      indices.forEach((index) => {
        const maybeWorklet = argumentsArray[index];
        if (!maybeWorklet) {
          return;
        }
        if ((0, types_2.isWorkletizableFunctionType)(maybeWorklet)) {
          (0, workletSubstitution_12.processWorklet)(maybeWorklet, state);
        }
      });
    }
  }
});

// lib/inlineStylesWarning.js
var require_inlineStylesWarning = __commonJS({
  "lib/inlineStylesWarning.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processInlineStylesWarning = void 0;
    var types_12 = require("@babel/types");
    var utils_12 = require_utils();
    var assert_1 = require("assert");
    function generateInlineStylesWarning(path) {
      return (0, types_12.callExpression)((0, types_12.arrowFunctionExpression)([], (0, types_12.blockStatement)([
        (0, types_12.expressionStatement)((0, types_12.callExpression)((0, types_12.memberExpression)((0, types_12.identifier)("console"), (0, types_12.identifier)("warn")), [
          (0, types_12.callExpression)((0, types_12.memberExpression)((0, types_12.callExpression)((0, types_12.identifier)("require"), [
            (0, types_12.stringLiteral)("react-native-reanimated")
          ]), (0, types_12.identifier)("getUseOfValueInStyleWarning")), [])
        ])),
        (0, types_12.returnStatement)(path.node)
      ])), []);
    }
    function processPropertyValueForInlineStylesWarning(path) {
      if (path.isMemberExpression() && (0, types_12.isIdentifier)(path.node.property)) {
        if (path.node.property.name === "value") {
          path.replaceWith(generateInlineStylesWarning(path));
        }
      }
    }
    function processTransformPropertyForInlineStylesWarning(path) {
      if ((0, types_12.isArrayExpression)(path.node)) {
        const elements = path.get("elements");
        (0, assert_1.strict)(Array.isArray(elements), "[Reanimated] `elements` should be an array.");
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
          if ((0, types_12.isIdentifier)(property.node.key) && property.node.key.name === "transform") {
            processTransformPropertyForInlineStylesWarning(value);
          } else {
            processPropertyValueForInlineStylesWarning(value);
          }
        }
      }
    }
    function processInlineStylesWarning(path, state) {
      if ((0, utils_12.isRelease)()) {
        return;
      }
      if (state.opts.disableInlineStylesWarning) {
        return;
      }
      if (path.node.name.name !== "style") {
        return;
      }
      if (!(0, types_12.isJSXExpressionContainer)(path.node.value)) {
        return;
      }
      const expression = path.get("value").get("expression");
      (0, assert_1.strict)(!Array.isArray(expression), "[Reanimated] `expression` should not be an array.");
      if (expression.isArrayExpression()) {
        const elements = expression.get("elements");
        (0, assert_1.strict)(Array.isArray(elements), "[Reanimated] `elements` should be an array.");
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

// lib/webOptimization.js
var require_webOptimization = __commonJS({
  "lib/webOptimization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.substituteWebCallExpression = void 0;
    var types_12 = require("@babel/types");
    function substituteWebCallExpression(path) {
      const callee = path.node.callee;
      if ((0, types_12.isIdentifier)(callee)) {
        const name = callee.name;
        if (name === "isWeb" || name === "shouldBeUseWeb") {
          path.replaceWith((0, types_12.booleanLiteral)(true));
        }
      }
    }
    exports2.substituteWebCallExpression = substituteWebCallExpression;
  }
});

// lib/plugin.js
Object.defineProperty(exports, "__esModule", { value: true });
var autoworkletization_1 = require_autoworkletization();
var types_1 = require_types();
var workletSubstitution_1 = require_workletSubstitution();
var inlineStylesWarning_1 = require_inlineStylesWarning();
var utils_1 = require_utils();
var globals_1 = require_globals();
var webOptimization_1 = require_webOptimization();
module.exports = function() {
  function runWithTaggedExceptions(fun) {
    try {
      fun();
    } catch (e) {
      throw new Error("[Reanimated] Babel plugin exception: " + e);
    }
  }
  return {
    pre() {
      runWithTaggedExceptions(() => {
        (0, globals_1.initializeGlobals)();
        utils_1.addCustomGlobals.call(this);
      });
    },
    visitor: {
      CallExpression: {
        enter(path, state) {
          runWithTaggedExceptions(() => {
            (0, autoworkletization_1.processCalleesAutoworkletizableCallbacks)(path, state);
            if (state.opts.substituteWebPlatformChecks) {
              (0, webOptimization_1.substituteWebCallExpression)(path);
            }
          });
        }
      },
      [types_1.WorkletizableFunction]: {
        enter(path, state) {
          runWithTaggedExceptions(() => {
            (0, workletSubstitution_1.processIfWithWorkletDirective)(path, state) || (0, autoworkletization_1.processIfAutoworkletizableCallback)(path, state);
          });
        }
      },
      JSXAttribute: {
        enter(path, state) {
          runWithTaggedExceptions(() => (0, inlineStylesWarning_1.processInlineStylesWarning)(path, state));
        }
      }
    }
  };
};
//# sourceMappingURL=plugin.js.map
