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

// lib/gestureHandlerAutoworkletization.js
var require_gestureHandlerAutoworkletization = __commonJS({
  "lib/gestureHandlerAutoworkletization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.gestureHandlerBuilderMethods = void 0;
    exports2.isGestureHandlerEventCallback = isGestureHandlerEventCallback;
    exports2.isGestureObjectEventCallbackMethod = isGestureObjectEventCallbackMethod;
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
    exports2.gestureHandlerBuilderMethods = /* @__PURE__ */ new Set([
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
    function isGestureObjectEventCallbackMethod(exp) {
      return (0, types_12.isMemberExpression)(exp) && (0, types_12.isIdentifier)(exp.property) && exports2.gestureHandlerBuilderMethods.has(exp.property.name) && containsGestureObject(exp.object);
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
    exports2.isLayoutAnimationCallback = isLayoutAnimationCallback;
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
      "energyThreshold",
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

// lib/types.js
var require_types = __commonJS({
  "lib/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generatedWorkletsDir = exports2.workletClassFactorySuffix = exports2.WorkletizableObject = exports2.WorkletizableFunction = void 0;
    exports2.isWorkletizableFunctionPath = isWorkletizableFunctionPath;
    exports2.isWorkletizableFunctionNode = isWorkletizableFunctionNode;
    exports2.isWorkletizableObjectPath = isWorkletizableObjectPath;
    exports2.isWorkletizableObjectNode = isWorkletizableObjectNode;
    var types_12 = require("@babel/types");
    exports2.WorkletizableFunction = "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod";
    exports2.WorkletizableObject = "ObjectExpression";
    function isWorkletizableFunctionPath(path) {
      return path.isFunctionDeclaration() || path.isFunctionExpression() || path.isArrowFunctionExpression() || path.isObjectMethod();
    }
    function isWorkletizableFunctionNode(node) {
      return (0, types_12.isFunctionDeclaration)(node) || (0, types_12.isFunctionExpression)(node) || (0, types_12.isArrowFunctionExpression)(node) || (0, types_12.isObjectMethod)(node);
    }
    function isWorkletizableObjectPath(path) {
      return path.isObjectExpression();
    }
    function isWorkletizableObjectNode(node) {
      return (0, types_12.isObjectExpression)(node);
    }
    exports2.workletClassFactorySuffix = "__classFactory";
    exports2.generatedWorkletsDir = "__generatedWorklets";
  }
});

// lib/utils.js
var require_utils = __commonJS({
  "lib/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isRelease = isRelease;
    exports2.replaceWithFactoryCall = replaceWithFactoryCall;
    var types_12 = require("@babel/types");
    function isRelease() {
      var _a, _b;
      const pattern = /(prod|release|stag[ei])/i;
      return !!(((_a = process.env.BABEL_ENV) === null || _a === void 0 ? void 0 : _a.match(pattern)) || ((_b = process.env.NODE_ENV) === null || _b === void 0 ? void 0 : _b.match(pattern)));
    }
    function replaceWithFactoryCall(toReplace, name, factoryCall) {
      if (!name || !needsDeclaration(toReplace)) {
        toReplace.replaceWith(factoryCall);
      } else {
        const replacement = (0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)((0, types_12.identifier)(name), factoryCall)
        ]);
        toReplace.replaceWith(replacement);
      }
    }
    function needsDeclaration(nodePath) {
      return (0, types_12.isScopable)(nodePath.parent) || (0, types_12.isExportNamedDeclaration)(nodePath.parent);
    }
  }
});

// lib/globals.js
var require_globals = __commonJS({
  "lib/globals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.globals = exports2.defaultGlobals = exports2.internalBindingsToCaptureFromGlobalScope = exports2.outsideBindingsToCaptureFromGlobalScope = void 0;
    exports2.initializeState = initializeState;
    exports2.initializeGlobals = initializeGlobals;
    exports2.addCustomGlobals = addCustomGlobals;
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
      "window",
      "globalThis",
      "self",
      "console",
      "performance",
      "arguments",
      "require",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "setTimeout",
      "clearTimeout",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "HermesInternal",
      "_WORKLET"
    ];
    exports2.outsideBindingsToCaptureFromGlobalScope = /* @__PURE__ */ new Set([
      "ReanimatedError"
    ]);
    exports2.internalBindingsToCaptureFromGlobalScope = /* @__PURE__ */ new Set([
      "WorkletsError"
    ]);
    var notCapturedIdentifiers_DEPRECATED = ["_IS_FABRIC"];
    function initializeState(state) {
      state.workletNumber = 1;
      state.classesToWorkletize = [];
      initializeGlobals();
      addCustomGlobals(state);
    }
    exports2.defaultGlobals = new Set(notCapturedIdentifiers.concat(notCapturedIdentifiers_DEPRECATED));
    function initializeGlobals() {
      exports2.globals = new Set(exports2.defaultGlobals);
    }
    function addCustomGlobals(state) {
      if (state.opts && Array.isArray(state.opts.globals)) {
        state.opts.globals.forEach((name) => {
          exports2.globals.add(name);
        });
      }
    }
  }
});

// lib/closure.js
var require_closure = __commonJS({
  "lib/closure.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getClosure = getClosure;
    var types_12 = require("@babel/types");
    var globals_12 = require_globals();
    function getClosure(funPath, state) {
      const capturedNames = /* @__PURE__ */ new Set();
      const closureVariables = new Array();
      const libraryBindingsToImport = /* @__PURE__ */ new Set();
      const relativeBindingsToImport = /* @__PURE__ */ new Set();
      let recrawled = false;
      funPath.traverse({
        "TSType|TSTypeAliasDeclaration|TSInterfaceDeclaration"(typePath) {
          typePath.skip();
        },
        ReferencedIdentifier(idPath) {
          if (idPath.isJSXIdentifier()) {
            return;
          }
          const name = idPath.node.name;
          if (capturedNames.has(name)) {
            return;
          }
          let binding = idPath.scope.getBinding(name);
          if (!binding && !recrawled) {
            recrawled = true;
            idPath.scope.crawl();
            binding = idPath.scope.getBinding(name);
          }
          if (!binding) {
            if (globals_12.globals.has(name)) {
              return;
            }
            capturedNames.add(name);
            closureVariables.push((0, types_12.cloneNode)(idPath.node, true));
            return;
          }
          if (globals_12.outsideBindingsToCaptureFromGlobalScope.has(name) || !state.opts.bundleMode && globals_12.internalBindingsToCaptureFromGlobalScope.has(name)) {
            return;
          }
          if ("id" in funPath.node) {
            const id = idPath.scope.getBindingIdentifier(name);
            if (id && id === funPath.node.id) {
              return;
            }
          }
          let scope = idPath.scope;
          while (scope !== funPath.scope.parent) {
            if (scope.hasOwnBinding(name)) {
              return;
            }
            scope = scope.parent;
          }
          if (state.opts.bundleMode && isImport(binding)) {
            if (isImportRelative(binding) && isAllowedForRelativeImports(state.filename, state.opts.workletizableModules)) {
              capturedNames.add(name);
              relativeBindingsToImport.add(binding);
              return;
            }
            const source = binding.path.parentPath.node.source.value;
            if (isWorkletizableModule(source, state.opts.workletizableModules)) {
              capturedNames.add(name);
              libraryBindingsToImport.add(binding);
              return;
            }
          }
          capturedNames.add(name);
          closureVariables.push((0, types_12.cloneNode)(idPath.node, true));
        }
      }, state);
      return {
        closureVariables,
        libraryBindingsToImport,
        relativeBindingsToImport
      };
    }
    function isImport(binding) {
      return binding.kind === "module" && binding.constant && (binding.path.isImportSpecifier() || binding.path.isImportDefaultSpecifier()) && binding.path.parentPath.isImportDeclaration();
    }
    function isImportRelative(imported) {
      return imported.path.parentPath.node.source.value.startsWith(".");
    }
    function isAllowedForRelativeImports(filename, workletizableModules) {
      return !!filename && (filename.includes("react-native-worklets") || !!(workletizableModules === null || workletizableModules === void 0 ? void 0 : workletizableModules.some((module3) => filename.includes(module3))));
    }
    function isWorkletizableModule(source, workletizableModules) {
      return source.startsWith("react-native-worklets") || !!(workletizableModules === null || workletizableModules === void 0 ? void 0 : workletizableModules.some((module3) => source.startsWith(module3)));
    }
  }
});

// lib/generate.js
var require_generate = __commonJS({
  "lib/generate.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateWorkletFile = generateWorkletFile;
    var core_1 = require("@babel/core");
    var types_12 = require("@babel/types");
    var assert_1 = __importDefault(require("assert"));
    var fs_1 = require("fs");
    var path_1 = require("path");
    var types_2 = require_types();
    function generateWorkletFile(libraryBindingsToImport, relativeBindingsToImport, factory, workletHash, state) {
      var _a;
      const libraryImports = Array.from(libraryBindingsToImport).filter((binding) => (binding.path.isImportSpecifier() || binding.path.isImportDefaultSpecifier()) && binding.path.parentPath.isImportDeclaration()).map((binding) => (0, types_12.importDeclaration)([(0, types_12.cloneNode)(binding.path.node, true)], (0, types_12.stringLiteral)(binding.path.parentPath.node.source.value)));
      const filesDirPath = (0, path_1.resolve)((0, path_1.dirname)(require.resolve("react-native-worklets/package.json")), types_2.generatedWorkletsDir);
      const relativeImports = Array.from(relativeBindingsToImport).filter((binding) => binding.path.isImportSpecifier() && binding.path.parentPath.isImportDeclaration()).map((binding) => {
        const resolved = (0, path_1.resolve)((0, path_1.dirname)(state.file.opts.filename), binding.path.parentPath.node.source.value);
        const importPath = (0, path_1.relative)(filesDirPath, resolved);
        return (0, types_12.importDeclaration)([(0, types_12.cloneNode)(binding.path.node, true)], (0, types_12.stringLiteral)(importPath));
      });
      const imports = [...libraryImports, ...relativeImports];
      const newProg = (0, types_12.program)([...imports, (0, types_12.exportDefaultDeclaration)(factory)]);
      const transformedProg = (_a = (0, core_1.transformFromAstSync)(newProg, void 0, {
        filename: state.file.opts.filename,
        presets: ["@babel/preset-typescript"],
        plugins: [],
        ast: false,
        babelrc: false,
        configFile: false,
        comments: false
      })) === null || _a === void 0 ? void 0 : _a.code;
      (0, assert_1.default)(transformedProg, "[Worklets] `transformedProg` is undefined.");
      if (!(0, fs_1.existsSync)(filesDirPath)) {
        (0, fs_1.mkdirSync)(filesDirPath, {});
      }
      const dedicatedFilePath = (0, path_1.resolve)(filesDirPath, `${workletHash}.js`);
      (0, fs_1.writeFileSync)(dedicatedFilePath, transformedProg);
    }
  }
});

// lib/transform.js
var require_transform = __commonJS({
  "lib/transform.js"(exports2) {
    "use strict";
    var __rest = exports2 && exports2.__rest || function(s, e) {
      var t = {};
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.workletTransformSync = workletTransformSync;
    var core_1 = require("@babel/core");
    function workletTransformSync(code, opts) {
      const { extraPlugins = [], extraPresets = [] } = opts, rest = __rest(opts, ["extraPlugins", "extraPresets"]);
      return (0, core_1.transformSync)(code, Object.assign(Object.assign({}, rest), { plugins: [...defaultPlugins, ...extraPlugins], presets: [...defaultPresets, ...extraPresets] }));
    }
    var defaultPresets = [
      require.resolve("@babel/preset-typescript")
    ];
    var defaultPlugins = [];
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
    var __importStar = exports2 && exports2.__importStar || function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2)
            if (Object.prototype.hasOwnProperty.call(o2, k))
              ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++)
            if (k[i] !== "default")
              __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.buildWorkletString = buildWorkletString;
    var core_1 = require("@babel/core");
    var generator_1 = __importDefault(require("@babel/generator"));
    var types_12 = require("@babel/types");
    var assert_1 = require("assert");
    var convertSourceMap = __importStar(require("convert-source-map"));
    var fs = __importStar(require("fs"));
    var transform_1 = require_transform();
    var types_2 = require_types();
    var utils_1 = require_utils();
    var MOCK_SOURCE_MAP = "mock source map";
    function buildWorkletString(fun, state, closureVariables, workletName, inputMap) {
      var _a;
      restoreRecursiveCalls(fun, workletName);
      const draftExpression = fun.program.body.find((obj) => (0, types_12.isFunctionDeclaration)(obj)) || fun.program.body.find((obj) => (0, types_12.isExpressionStatement)(obj));
      (0, assert_1.strict)(draftExpression, "[Reanimated] `draftExpression` is undefined.");
      const expression = (0, types_12.isFunctionDeclaration)(draftExpression) ? draftExpression : draftExpression.expression;
      (0, assert_1.strict)("params" in expression, "'params' property is undefined in 'expression'");
      (0, assert_1.strict)((0, types_12.isBlockStatement)(expression.body), "[Reanimated] `expression.body` is not a `BlockStatement`");
      const parsedClasses = /* @__PURE__ */ new Set();
      (0, core_1.traverse)(fun, {
        NewExpression(path) {
          if (!(0, types_12.isIdentifier)(path.node.callee)) {
            return;
          }
          const constructorName = path.node.callee.name;
          if (!closureVariables.some((variable) => variable.name === constructorName) || parsedClasses.has(constructorName)) {
            return;
          }
          const index = closureVariables.findIndex((variable) => variable.name === constructorName);
          closureVariables.splice(index, 1);
          const workletClassFactoryName = constructorName + types_2.workletClassFactorySuffix;
          closureVariables.push((0, types_12.identifier)(workletClassFactoryName));
          (0, types_12.assertBlockStatement)(expression.body);
          expression.body.body.unshift((0, types_12.variableDeclaration)("const", [
            (0, types_12.variableDeclarator)((0, types_12.identifier)(constructorName), (0, types_12.callExpression)((0, types_12.identifier)(workletClassFactoryName), []))
          ]));
          parsedClasses.add(constructorName);
        }
      });
      const workletFunction = (0, types_12.functionExpression)((0, types_12.identifier)(workletName), expression.params, expression.body, expression.generator, expression.async);
      const code = (0, generator_1.default)(workletFunction).code;
      (0, assert_1.strict)(inputMap, "[Reanimated] `inputMap` is undefined.");
      const includeSourceMap = !((0, utils_1.isRelease)() || state.opts.disableSourceMaps);
      if (includeSourceMap) {
        inputMap.sourcesContent = [];
        for (const sourceFile of inputMap.sources) {
          inputMap.sourcesContent.push(fs.readFileSync(sourceFile).toString("utf-8"));
        }
      }
      const transformed = (0, transform_1.workletTransformSync)(code, {
        filename: state.file.opts.filename,
        extraPlugins: [
          getClosurePlugin(closureVariables),
          ...(_a = state.opts.extraPlugins) !== null && _a !== void 0 ? _a : []
        ],
        extraPresets: state.opts.extraPresets,
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
    function restoreRecursiveCalls(file, newName) {
      (0, core_1.traverse)(file, {
        FunctionExpression(path) {
          if (!path.node.id) {
            path.stop();
            return;
          }
          const oldName = path.node.id.name;
          const scope = path.scope;
          scope.rename(oldName, newName);
        }
      });
    }
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
    function getClosurePlugin(closureVariables) {
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
    exports2.makeWorkletFactory = makeWorkletFactory;
    var generator_1 = __importDefault(require("@babel/generator"));
    var types_12 = require("@babel/types");
    var assert_1 = require("assert");
    var path_1 = require("path");
    var closure_1 = require_closure();
    var generate_1 = require_generate();
    var transform_1 = require_transform();
    var types_2 = require_types();
    var utils_1 = require_utils();
    var workletStringCode_1 = require_workletStringCode();
    var REAL_VERSION = require("../package.json").version;
    var MOCK_VERSION = "x.y.z";
    function makeWorkletFactory(fun, state) {
      var _a;
      removeWorkletDirective(fun);
      (0, assert_1.strict)(state.file.opts.filename, "[Reanimated] `state.file.opts.filename` is undefined.");
      const codeObject = (0, generator_1.default)(fun.node, {
        sourceMaps: true,
        sourceFileName: state.file.opts.filename
      });
      codeObject.code = "(" + (fun.isObjectMethod() ? "function " : "") + codeObject.code + "\n)";
      const transformed = (0, transform_1.workletTransformSync)(codeObject.code, {
        extraPlugins: [...extraPlugins, ...(_a = state.opts.extraPlugins) !== null && _a !== void 0 ? _a : []],
        extraPresets: state.opts.extraPresets,
        filename: state.file.opts.filename,
        ast: true,
        babelrc: false,
        configFile: false,
        inputSourceMap: codeObject.map
      });
      (0, assert_1.strict)(transformed, "[Reanimated] `transformed` is undefined.");
      (0, assert_1.strict)(transformed.ast, "[Reanimated] `transformed.ast` is undefined.");
      const { closureVariables, libraryBindingsToImport, relativeBindingsToImport } = (0, closure_1.getClosure)(fun, state);
      const clone = (0, types_12.cloneNode)(fun.node);
      const funExpression = (0, types_12.isBlockStatement)(clone.body) ? (0, types_12.functionExpression)(null, clone.params, clone.body, clone.generator, clone.async) : clone;
      const { workletName, reactName } = makeWorkletName(fun, state);
      let mutatedClosureVariables;
      if (state.opts.bundleMode) {
        mutatedClosureVariables = closureVariables.map((variable) => (0, types_12.cloneNode)(variable, true));
      } else {
        mutatedClosureVariables = closureVariables;
      }
      let [funString, sourceMapString] = (0, workletStringCode_1.buildWorkletString)(transformed.ast, state, mutatedClosureVariables, workletName, transformed.map);
      (0, assert_1.strict)(funString, "[Reanimated] `funString` is undefined.");
      const workletHash = hash(funString);
      let lineOffset = 1;
      if (closureVariables.length > 0) {
        lineOffset -= closureVariables.length + 2;
      }
      const pathForStringDefinitions = fun.parentPath.isProgram() ? fun : fun.findParent((path) => {
        var _a2, _b;
        return (_b = (_a2 = path.parentPath) === null || _a2 === void 0 ? void 0 : _a2.isProgram()) !== null && _b !== void 0 ? _b : false;
      });
      (0, assert_1.strict)(pathForStringDefinitions, "[Reanimated] `pathForStringDefinitions` is null.");
      (0, assert_1.strict)(pathForStringDefinitions.parentPath, "[Reanimated] `pathForStringDefinitions.parentPath` is null.");
      const initDataId = pathForStringDefinitions.parentPath.scope.generateUidIdentifier(`worklet_${workletHash}_init_data`);
      const initDataObjectExpression = (0, types_12.objectExpression)([
        (0, types_12.objectProperty)((0, types_12.identifier)("code"), (0, types_12.stringLiteral)(funString))
      ]);
      const shouldInjectLocation = !(0, utils_1.isRelease)();
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
      const shouldIncludeInitData = !state.opts.omitNativeOnlyData;
      if (shouldIncludeInitData && !state.opts.bundleMode) {
        pathForStringDefinitions.insertBefore((0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)(initDataId, initDataObjectExpression)
        ]));
      }
      (0, assert_1.strict)(!(0, types_12.isFunctionDeclaration)(funExpression), "[Reanimated] `funExpression` is a `FunctionDeclaration`.");
      (0, assert_1.strict)(!(0, types_12.isObjectMethod)(funExpression), "[Reanimated] `funExpression` is an `ObjectMethod`.");
      const statements = [
        (0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)((0, types_12.identifier)(reactName), funExpression)
        ]),
        (0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(reactName), (0, types_12.identifier)("__closure"), false), (0, types_12.objectExpression)(closureVariables.map((variable) => !state.opts.bundleMode && variable.name.endsWith(types_2.workletClassFactorySuffix) ? (0, types_12.objectProperty)((0, types_12.identifier)(variable.name), (0, types_12.memberExpression)((0, types_12.identifier)(variable.name.slice(0, variable.name.length - types_2.workletClassFactorySuffix.length)), (0, types_12.identifier)(variable.name))) : (0, types_12.objectProperty)((0, types_12.cloneNode)(variable, true), (0, types_12.cloneNode)(variable, true), false, true))))),
        (0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(reactName), (0, types_12.identifier)("__workletHash"), false), (0, types_12.numericLiteral)(workletHash)))
      ];
      const shouldInjectVersion = !(0, utils_1.isRelease)();
      if (shouldInjectVersion) {
        statements.push((0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(reactName), (0, types_12.identifier)("__pluginVersion")), (0, types_12.stringLiteral)(shouldMockVersion() ? MOCK_VERSION : REAL_VERSION))));
      }
      if (shouldIncludeInitData && !state.opts.bundleMode) {
        statements.push((0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(reactName), (0, types_12.identifier)("__initData"), false), (0, types_12.cloneNode)(initDataId, true))));
      }
      if (!(0, utils_1.isRelease)()) {
        statements.unshift((0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)((0, types_12.identifier)("_e"), (0, types_12.arrayExpression)([
            (0, types_12.newExpression)((0, types_12.memberExpression)((0, types_12.identifier)("global"), (0, types_12.identifier)("Error")), []),
            (0, types_12.numericLiteral)(lineOffset),
            (0, types_12.numericLiteral)(-27)
          ]))
        ]));
        statements.push((0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(reactName), (0, types_12.identifier)("__stackDetails"), false), (0, types_12.identifier)("_e"))));
      }
      statements.push((0, types_12.returnStatement)((0, types_12.identifier)(reactName)));
      const factoryParams = closureVariables.map((variableId) => {
        const clonedId = (0, types_12.cloneNode)(variableId, true);
        if (!state.opts.bundleMode && clonedId.name.endsWith(types_2.workletClassFactorySuffix)) {
          clonedId.name = clonedId.name.slice(0, clonedId.name.length - types_2.workletClassFactorySuffix.length);
        }
        return clonedId;
      });
      if (shouldIncludeInitData && !state.opts.bundleMode) {
        factoryParams.unshift((0, types_12.cloneNode)(initDataId, true));
      }
      const factoryParamObjectPattern = (0, types_12.objectPattern)(factoryParams.map((param) => (0, types_12.objectProperty)((0, types_12.cloneNode)(param, true), (0, types_12.cloneNode)(param, true), false, true)));
      const factory = (0, types_12.functionExpression)((0, types_12.identifier)(workletName + "Factory"), [factoryParamObjectPattern], (0, types_12.blockStatement)(statements));
      const factoryCallArgs = factoryParams.map((param) => (0, types_12.cloneNode)(param, true));
      const factoryCallParamPack = (0, types_12.objectExpression)(factoryCallArgs.map((param) => (0, types_12.objectProperty)((0, types_12.cloneNode)(param, true), (0, types_12.cloneNode)(param, true), false, true)));
      if (state.opts.bundleMode) {
        (0, generate_1.generateWorkletFile)(libraryBindingsToImport, relativeBindingsToImport, factory, workletHash, state);
      }
      factory.workletized = true;
      return { factory, factoryCallParamPack, workletHash };
    }
    function removeWorkletDirective(fun) {
      fun.traverse({
        DirectiveLiteral(nodePath) {
          if (nodePath.node.value === "worklet" && nodePath.getFunctionParent() === fun) {
            nodePath.parentPath.remove();
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
    function makeWorkletName(fun, state) {
      let source = "unknownFile";
      if (state.file.opts.filename) {
        const filepath = state.file.opts.filename;
        source = (0, path_1.basename)(filepath);
        const splitFilepath = filepath.split("/");
        const nodeModulesIndex = splitFilepath.indexOf("node_modules");
        if (nodeModulesIndex !== -1) {
          const libraryName = splitFilepath[nodeModulesIndex + 1];
          source = `${libraryName}_${source}`;
        }
      }
      const suffix = `${source}${state.workletNumber++}`;
      let reactName = "";
      if ((0, types_12.isObjectMethod)(fun.node) && (0, types_12.isIdentifier)(fun.node.key)) {
        reactName = fun.node.key.name;
      } else if (((0, types_12.isFunctionDeclaration)(fun.node) || (0, types_12.isFunctionExpression)(fun.node)) && (0, types_12.isIdentifier)(fun.node.id)) {
        reactName = fun.node.id.name;
      }
      const workletName = reactName ? (0, types_12.toIdentifier)(`${reactName}_${suffix}`) : (0, types_12.toIdentifier)(suffix);
      reactName = reactName || (0, types_12.toIdentifier)(suffix);
      return { workletName, reactName };
    }
    var extraPlugins = [
      require.resolve("@babel/plugin-transform-shorthand-properties"),
      require.resolve("@babel/plugin-transform-arrow-functions"),
      require.resolve("@babel/plugin-transform-optional-chaining"),
      require.resolve("@babel/plugin-transform-nullish-coalescing-operator"),
      [
        require.resolve("@babel/plugin-transform-template-literals"),
        { loose: true }
      ]
    ];
  }
});

// lib/workletFactoryCall.js
var require_workletFactoryCall = __commonJS({
  "lib/workletFactoryCall.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeWorkletFactoryCall = makeWorkletFactoryCall;
    var types_12 = require("@babel/types");
    var types_2 = require_types();
    var workletFactory_1 = require_workletFactory();
    function makeWorkletFactoryCall(path, state) {
      const { factory, factoryCallParamPack, workletHash } = (0, workletFactory_1.makeWorkletFactory)(path, state);
      let factoryCall;
      if (state.opts.bundleMode) {
        factoryCall = (0, types_12.callExpression)((0, types_12.memberExpression)((0, types_12.callExpression)((0, types_12.identifier)("require"), [
          (0, types_12.stringLiteral)(`react-native-worklets/${types_2.generatedWorkletsDir}/${workletHash}.js`)
        ]), (0, types_12.identifier)("default")), [factoryCallParamPack]);
      } else {
        factoryCall = (0, types_12.callExpression)(factory, [factoryCallParamPack]);
      }
      addStackTraceDataToWorkletFactory(path, factoryCall);
      const replacement = factoryCall;
      return replacement;
    }
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
    exports2.processIfWithWorkletDirective = processIfWithWorkletDirective;
    exports2.processWorklet = processWorklet;
    exports2.substituteObjectMethodWithObjectProperty = substituteObjectMethodWithObjectProperty;
    var types_12 = require("@babel/types");
    var types_2 = require_types();
    var utils_1 = require_utils();
    var workletFactoryCall_1 = require_workletFactoryCall();
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
    function processWorklet(path, state) {
      path.traverse({
        [types_2.WorkletizableFunction](subPath, passedState) {
          processIfWithWorkletDirective(subPath, passedState);
        }
      }, state);
      const workletFactoryCall = (0, workletFactoryCall_1.makeWorkletFactoryCall)(path, state);
      substituteWorkletWithWorkletFactoryCall(path, workletFactoryCall);
      path.scope.getProgramParent().crawl();
    }
    function hasWorkletDirective(directives) {
      return directives.some((directive) => (0, types_12.isDirectiveLiteral)(directive.value) && directive.value.value === "worklet");
    }
    function substituteWorkletWithWorkletFactoryCall(path, workletFactoryCall) {
      var _a;
      if (path.isObjectMethod()) {
        substituteObjectMethodWithObjectProperty(path, workletFactoryCall);
      } else {
        const name = "id" in path.node ? (_a = path.node.id) === null || _a === void 0 ? void 0 : _a.name : void 0;
        (0, utils_1.replaceWithFactoryCall)(path, name, workletFactoryCall);
      }
    }
    function substituteObjectMethodWithObjectProperty(path, workletFactoryCall) {
      const replacement = (0, types_12.objectProperty)(path.node.key, workletFactoryCall);
      path.replaceWith(replacement);
    }
  }
});

// lib/objectWorklets.js
var require_objectWorklets = __commonJS({
  "lib/objectWorklets.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processWorkletizableObject = processWorkletizableObject;
    var types_12 = require_types();
    var workletSubstitution_12 = require_workletSubstitution();
    function processWorkletizableObject(path, state) {
      const properties = path.get("properties");
      for (const property of properties) {
        if (property.isObjectMethod()) {
          (0, workletSubstitution_12.processWorklet)(property, state);
        } else if (property.isObjectProperty()) {
          const value = property.get("value");
          if ((0, types_12.isWorkletizableFunctionPath)(value)) {
            (0, workletSubstitution_12.processWorklet)(value, state);
          }
        } else {
          throw new Error(`[Reanimated] '${property.type}' as to-be workletized argument is not supported for object hooks.`);
        }
      }
    }
  }
});

// lib/referencedWorklets.js
var require_referencedWorklets = __commonJS({
  "lib/referencedWorklets.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.findReferencedWorklet = findReferencedWorklet;
    var types_12 = require_types();
    function findReferencedWorklet(workletIdentifier, acceptWorkletizableFunction, acceptObject) {
      const workletName = workletIdentifier.node.name;
      const scope = workletIdentifier.scope;
      const workletBinding = scope.getBinding(workletName);
      if (!workletBinding) {
        return void 0;
      }
      if (acceptWorkletizableFunction && workletBinding.path.isFunctionDeclaration()) {
        return workletBinding.path;
      }
      const isConstant = workletBinding.constant;
      if (isConstant) {
        return findReferencedWorkletFromVariableDeclarator(workletBinding, acceptWorkletizableFunction, acceptObject);
      }
      return findReferencedWorkletFromAssignmentExpression(workletBinding, acceptWorkletizableFunction, acceptObject);
    }
    function findReferencedWorkletFromVariableDeclarator(workletBinding, acceptWorkletizableFunction, acceptObject) {
      const workletDeclaration = workletBinding.path;
      if (!workletDeclaration.isVariableDeclarator()) {
        return void 0;
      }
      const worklet = workletDeclaration.get("init");
      if (acceptWorkletizableFunction && (0, types_12.isWorkletizableFunctionPath)(worklet)) {
        return worklet;
      }
      if (acceptObject && (0, types_12.isWorkletizableObjectPath)(worklet)) {
        return worklet;
      }
      if (worklet.isIdentifier() && worklet.isReferencedIdentifier()) {
        return findReferencedWorklet(worklet, acceptWorkletizableFunction, acceptObject);
      }
      return void 0;
    }
    function findReferencedWorkletFromAssignmentExpression(workletBinding, acceptWorkletizableFunction, acceptObject) {
      const workletDeclaration = workletBinding.constantViolations.reverse().find((constantViolation) => constantViolation.isAssignmentExpression() && (acceptWorkletizableFunction && (0, types_12.isWorkletizableFunctionPath)(constantViolation.get("right")) || acceptObject && (0, types_12.isWorkletizableObjectPath)(constantViolation.get("right"))));
      if (!workletDeclaration || !workletDeclaration.isAssignmentExpression()) {
        return void 0;
      }
      const workletDefinition = workletDeclaration.get("right");
      if (acceptWorkletizableFunction && (0, types_12.isWorkletizableFunctionPath)(workletDefinition)) {
        return workletDefinition;
      }
      if (acceptObject && (0, types_12.isWorkletizableObjectPath)(workletDefinition)) {
        return workletDefinition;
      }
      if (workletDefinition.isIdentifier() && workletDefinition.isReferencedIdentifier()) {
        return findReferencedWorklet(workletDefinition, acceptWorkletizableFunction, acceptObject);
      }
      return void 0;
    }
  }
});

// lib/autoworkletization.js
var require_autoworkletization = __commonJS({
  "lib/autoworkletization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processIfAutoworkletizableCallback = processIfAutoworkletizableCallback;
    exports2.processCalleesAutoworkletizableCallbacks = processCalleesAutoworkletizableCallbacks;
    var types_12 = require("@babel/types");
    var gestureHandlerAutoworkletization_1 = require_gestureHandlerAutoworkletization();
    var layoutAnimationAutoworkletization_1 = require_layoutAnimationAutoworkletization();
    var objectWorklets_1 = require_objectWorklets();
    var referencedWorklets_1 = require_referencedWorklets();
    var types_2 = require_types();
    var workletSubstitution_12 = require_workletSubstitution();
    var reanimatedObjectHooks = /* @__PURE__ */ new Set(["useAnimatedScrollHandler"]);
    var reanimatedFunctionHooks = /* @__PURE__ */ new Set([
      "useFrameCallback",
      "useAnimatedStyle",
      "useAnimatedProps",
      "createAnimatedPropAdapter",
      "useDerivedValue",
      "useAnimatedScrollHandler",
      "useAnimatedReaction",
      "withTiming",
      "withSpring",
      "withDecay",
      "withRepeat",
      "runOnUI",
      "executeOnUIRuntimeSync",
      "scheduleOnUI",
      "runOnUISync",
      "runOnUIAsync",
      "runOnRuntime",
      "scheduleOnRuntime"
    ]);
    var reanimatedFunctionArgsToWorkletize = new Map([
      ["useFrameCallback", [0]],
      ["useAnimatedStyle", [0]],
      ["useAnimatedProps", [0]],
      ["createAnimatedPropAdapter", [0]],
      ["useDerivedValue", [0]],
      ["useAnimatedScrollHandler", [0]],
      ["useAnimatedReaction", [0, 1]],
      ["withTiming", [2]],
      ["withSpring", [2]],
      ["withDecay", [1]],
      ["withRepeat", [3]],
      ["runOnUI", [0]],
      ["executeOnUIRuntimeSync", [0]],
      ["scheduleOnUI", [0]],
      ["runOnUISync", [0]],
      ["runOnUIAsync", [0]],
      ["runOnRuntime", [1]],
      ["scheduleOnRuntime", [1]],
      ...Array.from(gestureHandlerAutoworkletization_1.gestureHandlerBuilderMethods).map((name) => [name, [0]])
    ]);
    function processIfAutoworkletizableCallback(path, state) {
      if ((0, gestureHandlerAutoworkletization_1.isGestureHandlerEventCallback)(path) || (0, layoutAnimationAutoworkletization_1.isLayoutAnimationCallback)(path)) {
        (0, workletSubstitution_12.processWorklet)(path, state);
        return true;
      }
      return false;
    }
    function processCalleesAutoworkletizableCallbacks(path, state) {
      const callee = (0, types_12.isSequenceExpression)(path.node.callee) ? path.node.callee.expressions[path.node.callee.expressions.length - 1] : path.node.callee;
      const name = "name" in callee ? callee.name : "property" in callee && "name" in callee.property ? callee.property.name : void 0;
      if (name === void 0) {
        return;
      }
      if (reanimatedFunctionHooks.has(name) || reanimatedObjectHooks.has(name)) {
        const acceptWorkletizableFunction = reanimatedFunctionHooks.has(name);
        const acceptObject = reanimatedObjectHooks.has(name);
        const argIndices = reanimatedFunctionArgsToWorkletize.get(name);
        const args = path.get("arguments").filter((_, index) => argIndices.includes(index));
        processArgs(args, state, acceptWorkletizableFunction, acceptObject);
      } else if (!(0, types_12.isV8IntrinsicIdentifier)(callee) && (0, gestureHandlerAutoworkletization_1.isGestureObjectEventCallbackMethod)(callee)) {
        const args = path.get("arguments");
        processArgs(args, state, true, true);
      }
    }
    function processArgs(args, state, acceptWorkletizableFunction, acceptObject) {
      args.forEach((arg) => {
        var _a;
        const maybeWorklet = findWorklet(arg, acceptWorkletizableFunction, acceptObject);
        if (!maybeWorklet || ((_a = maybeWorklet.getFunctionParent()) === null || _a === void 0 ? void 0 : _a.node.workletized)) {
          return;
        }
        if ((0, types_2.isWorkletizableFunctionPath)(maybeWorklet)) {
          (0, workletSubstitution_12.processWorklet)(maybeWorklet, state);
        } else if ((0, types_2.isWorkletizableObjectPath)(maybeWorklet)) {
          (0, objectWorklets_1.processWorkletizableObject)(maybeWorklet, state);
        }
      });
    }
    function findWorklet(arg, acceptWorkletizableFunction, acceptObject) {
      if (acceptWorkletizableFunction && (0, types_2.isWorkletizableFunctionPath)(arg)) {
        return arg;
      }
      if (acceptObject && (0, types_2.isWorkletizableObjectPath)(arg)) {
        return arg;
      }
      if (arg.isIdentifier() && arg.isReferencedIdentifier()) {
        return (0, referencedWorklets_1.findReferencedWorklet)(arg, acceptWorkletizableFunction, acceptObject);
      }
      return void 0;
    }
  }
});

// lib/class.js
var require_class = __commonJS({
  "lib/class.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processIfWorkletClass = processIfWorkletClass;
    var generator_1 = __importDefault(require("@babel/generator"));
    var traverse_1 = __importDefault(require("@babel/traverse"));
    var types_12 = require("@babel/types");
    var assert_1 = require("assert");
    var transform_1 = require_transform();
    var types_2 = require_types();
    var utils_1 = require_utils();
    var classWorkletMarker = "__workletClass";
    function processIfWorkletClass(classPath, state) {
      if (!isWorkletizableClass(classPath, state) || state.opts.bundleMode) {
        return false;
      }
      removeWorkletClassMarker(classPath.node.body);
      processClass(classPath, state);
      return true;
    }
    function processClass(classPath, state) {
      (0, assert_1.strict)(classPath.node.id);
      const className = classPath.node.id.name;
      const polyfilledClassAst = getPolyfilledAst(classPath.node, state);
      sortPolyfills(polyfilledClassAst);
      appendWorkletDirectiveToPolyfills(polyfilledClassAst.program.body);
      replaceClassDeclarationWithFactoryAndCall(polyfilledClassAst.program.body, className);
      polyfilledClassAst.program.body.push((0, types_12.returnStatement)((0, types_12.identifier)(className)));
      const factoryFactory = (0, types_12.functionExpression)(null, [], (0, types_12.blockStatement)([...polyfilledClassAst.program.body]));
      const factoryCall = (0, types_12.callExpression)(factoryFactory, []);
      (0, utils_1.replaceWithFactoryCall)(classPath, className, factoryCall);
    }
    function getPolyfilledAst(classNode, state) {
      var _a;
      const classCode = (0, generator_1.default)(classNode).code;
      const classWithPolyfills = (0, transform_1.workletTransformSync)(classCode, {
        extraPlugins: [
          "@babel/plugin-transform-class-properties",
          "@babel/plugin-transform-classes",
          "@babel/plugin-transform-unicode-regex",
          ...(_a = state.opts.extraPlugins) !== null && _a !== void 0 ? _a : []
        ],
        extraPresets: state.opts.extraPresets,
        filename: state.file.opts.filename,
        ast: true,
        babelrc: false,
        configFile: false
      });
      (0, assert_1.strict)(classWithPolyfills && classWithPolyfills.ast);
      return classWithPolyfills.ast;
    }
    function appendWorkletDirectiveToPolyfills(statements) {
      statements.forEach((statement) => {
        if ((0, types_12.isFunctionDeclaration)(statement)) {
          const workletDirective = (0, types_12.directive)((0, types_12.directiveLiteral)("worklet"));
          statement.body.directives.push(workletDirective);
        }
      });
    }
    function replaceClassDeclarationWithFactoryAndCall(statements, className) {
      const classFactoryName = className + types_2.workletClassFactorySuffix;
      const classDeclarationIndex = getPolyfilledClassDeclarationIndex(statements, className);
      const classDeclarationToReplace = statements[classDeclarationIndex];
      const classDeclarationInit = classDeclarationToReplace.declarations[0].init;
      const classFactoryDeclaration = (0, types_12.functionDeclaration)((0, types_12.identifier)(classFactoryName), [], (0, types_12.blockStatement)([
        (0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)((0, types_12.identifier)(className), classDeclarationInit)
        ]),
        (0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(className), (0, types_12.identifier)(classFactoryName)), (0, types_12.identifier)(classFactoryName))),
        (0, types_12.returnStatement)((0, types_12.identifier)(className))
      ], [(0, types_12.directive)((0, types_12.directiveLiteral)("worklet"))]));
      const newClassDeclaration = (0, types_12.variableDeclaration)("const", [
        (0, types_12.variableDeclarator)((0, types_12.identifier)(className), (0, types_12.callExpression)((0, types_12.identifier)(classFactoryName), []))
      ]);
      statements.splice(classDeclarationIndex, 1, classFactoryDeclaration, newClassDeclaration);
    }
    function getPolyfilledClassDeclarationIndex(statements, className) {
      const index = statements.findIndex((statement) => (0, types_12.isVariableDeclaration)(statement) && statement.declarations.some((declaration) => (0, types_12.isIdentifier)(declaration.id) && declaration.id.name === className));
      (0, assert_1.strict)(index >= 0);
      return index;
    }
    function hasWorkletClassMarker(classBody) {
      return classBody.body.some((statement) => (0, types_12.isClassProperty)(statement) && (0, types_12.isIdentifier)(statement.key) && statement.key.name === classWorkletMarker);
    }
    function removeWorkletClassMarker(classBody) {
      classBody.body = classBody.body.filter((statement) => !(0, types_12.isClassProperty)(statement) || !(0, types_12.isIdentifier)(statement.key) || statement.key.name !== classWorkletMarker);
    }
    function sortPolyfills(ast) {
      const toSort = getPolyfillsToSort(ast);
      const sorted = topoSort(toSort);
      const toSortIndices = toSort.map((element) => element.index);
      const sortedIndices = sorted.map((element) => element.index);
      const statements = ast.program.body;
      const oldStatements = [...statements];
      for (let i = 0; i < toSort.length; i++) {
        const sourceIndex = sortedIndices[i];
        const targetIndex = toSortIndices[i];
        const source = oldStatements[sourceIndex];
        statements[targetIndex] = source;
      }
    }
    function getPolyfillsToSort(ast) {
      const polyfills = [];
      (0, traverse_1.default)(ast, {
        Program: {
          enter: (functionPath) => {
            const statements = functionPath.get("body");
            statements.forEach((statement, index) => {
              var _a;
              const bindingIdentifiers = statement.getBindingIdentifiers();
              if (!statement.isFunctionDeclaration() || !((_a = statement.node.id) === null || _a === void 0 ? void 0 : _a.name)) {
                return;
              }
              const element = {
                name: statement.node.id.name,
                index,
                dependencies: /* @__PURE__ */ new Set()
              };
              polyfills.push(element);
              statement.traverse({
                Identifier(path) {
                  if (isOutsideDependency(path, bindingIdentifiers, statement)) {
                    element.dependencies.add(path.node.name);
                  }
                }
              });
            });
          }
        }
      });
      return polyfills;
    }
    function topoSort(toSort) {
      const sorted = [];
      const stack = /* @__PURE__ */ new Set();
      for (const element of toSort) {
        recursiveTopoSort(element, toSort, sorted, stack);
      }
      return sorted;
    }
    function recursiveTopoSort(current, toSort, sorted, stack) {
      if (stack.has(current.name)) {
        throw new Error("Cycle detected. This should never happen.");
      }
      if (sorted.find((element) => element.name === current.name)) {
        return;
      }
      stack.add(current.name);
      for (const dependency of current.dependencies) {
        if (!sorted.find((element) => element.name === dependency)) {
          const next = toSort.find((element) => element.name === dependency);
          (0, assert_1.strict)(next);
          recursiveTopoSort(next, toSort, sorted, stack);
        }
      }
      sorted.push(current);
      stack.delete(current.name);
    }
    function isOutsideDependency(identifierPath, bindingIdentifiers, functionPath) {
      return identifierPath.isReferencedIdentifier() && !(identifierPath.node.name in bindingIdentifiers) && !functionPath.scope.hasOwnBinding(identifierPath.node.name) && functionPath.scope.hasReference(identifierPath.node.name);
    }
    function isWorkletizableClass(classPath, state) {
      var _a;
      const className = (_a = classPath.node.id) === null || _a === void 0 ? void 0 : _a.name;
      const classNode = classPath.node;
      if (!className) {
        return false;
      }
      const isMarked = hasWorkletClassMarker(classNode.body);
      const isMemoizedNode = state.classesToWorkletize.some((record) => record.node === classNode);
      const isTopLevelMemoizedName = classPath.parentPath.isProgram() && state.classesToWorkletize.some((record) => record.name === className);
      state.classesToWorkletize = state.classesToWorkletize.filter((record) => record.node !== classNode && record.name !== className);
      const result = isMarked || isMemoizedNode || isTopLevelMemoizedName;
      return result;
    }
  }
});

// lib/contextObject.js
var require_contextObject = __commonJS({
  "lib/contextObject.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.contextObjectMarker = void 0;
    exports2.processIfWorkletContextObject = processIfWorkletContextObject;
    exports2.isContextObject = isContextObject;
    var types_12 = require("@babel/types");
    exports2.contextObjectMarker = "__workletContextObject";
    function processIfWorkletContextObject(path, _state) {
      if (!isContextObject(path.node)) {
        return false;
      }
      removeContextObjectMarker(path.node);
      processWorkletContextObject(path.node);
      return true;
    }
    function isContextObject(objectExpression) {
      return objectExpression.properties.some((property) => (0, types_12.isObjectProperty)(property) && (0, types_12.isIdentifier)(property.key) && property.key.name === exports2.contextObjectMarker);
    }
    function processWorkletContextObject(objectExpression) {
      const workletObjectFactory = (0, types_12.functionExpression)(null, [], (0, types_12.blockStatement)([(0, types_12.returnStatement)((0, types_12.cloneNode)(objectExpression))], [(0, types_12.directive)((0, types_12.directiveLiteral)("worklet"))]));
      objectExpression.properties.push((0, types_12.objectProperty)((0, types_12.identifier)(`${exports2.contextObjectMarker}Factory`), workletObjectFactory));
    }
    function removeContextObjectMarker(objectExpression) {
      objectExpression.properties = objectExpression.properties.filter((property) => !((0, types_12.isObjectProperty)(property) && (0, types_12.isIdentifier)(property.key) && property.key.name === exports2.contextObjectMarker));
    }
  }
});

// lib/file.js
var require_file = __commonJS({
  "lib/file.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processIfWorkletFile = processIfWorkletFile;
    exports2.isImplicitContextObject = isImplicitContextObject;
    var types_12 = require("@babel/types");
    var contextObject_12 = require_contextObject();
    var types_2 = require_types();
    function processIfWorkletFile(path, state) {
      if (!path.node.directives.some((functionDirective) => functionDirective.value.value === "worklet")) {
        return false;
      }
      path.node.directives = path.node.directives.filter((functionDirective) => functionDirective.value.value !== "worklet");
      processWorkletFile(path, state);
      return true;
    }
    function processWorkletFile(programPath, state) {
      const statements = programPath.get("body");
      dehoistCommonJSExports(programPath.node);
      statements.forEach((statement) => {
        const candidatePath = getCandidate(statement);
        processWorkletizableEntity(candidatePath, state);
      });
    }
    function getCandidate(statementPath) {
      if (statementPath.isExportNamedDeclaration() || statementPath.isExportDefaultDeclaration()) {
        return statementPath.get("declaration");
      } else {
        return statementPath;
      }
    }
    function processWorkletizableEntity(nodePath, state) {
      var _a;
      if ((0, types_2.isWorkletizableFunctionPath)(nodePath)) {
        if (nodePath.isArrowFunctionExpression()) {
          replaceImplicitReturnWithBlock(nodePath.node);
        }
        appendWorkletDirective(nodePath.node.body);
      } else if ((0, types_2.isWorkletizableObjectPath)(nodePath)) {
        if (isImplicitContextObject(nodePath)) {
          appendWorkletContextObjectMarker(nodePath.node);
        } else {
          processWorkletAggregator(nodePath, state);
        }
      } else if (nodePath.isVariableDeclaration()) {
        processVariableDeclaration(nodePath, state);
      } else if (nodePath.isClassDeclaration()) {
        appendWorkletClassMarker(nodePath.node.body);
        if ((_a = nodePath.node.id) === null || _a === void 0 ? void 0 : _a.name) {
          state.classesToWorkletize.push({
            node: nodePath.node,
            name: nodePath.node.id.name
          });
        }
      }
    }
    function processVariableDeclaration(variableDeclarationPath, state) {
      const declarations = variableDeclarationPath.get("declarations");
      declarations.forEach((declaration) => {
        const initPath = declaration.get("init");
        if (initPath.isExpression()) {
          processWorkletizableEntity(initPath, state);
        }
      });
    }
    function processWorkletAggregator(objectPath, state) {
      const properties = objectPath.get("properties");
      properties.forEach((property) => {
        if (property.isObjectMethod()) {
          appendWorkletDirective(property.node.body);
        } else if (property.isObjectProperty()) {
          const valuePath = property.get("value");
          processWorkletizableEntity(valuePath, state);
        }
      });
    }
    function replaceImplicitReturnWithBlock(path) {
      if (!(0, types_12.isBlockStatement)(path.body)) {
        path.body = (0, types_12.blockStatement)([(0, types_12.returnStatement)(path.body)]);
      }
    }
    function appendWorkletDirective(node) {
      if (!node.directives.some((functionDirective) => functionDirective.value.value === "worklet")) {
        node.directives.push((0, types_12.directive)((0, types_12.directiveLiteral)("worklet")));
      }
    }
    function appendWorkletContextObjectMarker(objectExpression) {
      if (objectExpression.properties.some((value) => (0, types_12.isObjectProperty)(value) && (0, types_12.isIdentifier)(value.key) && value.key.name === contextObject_12.contextObjectMarker)) {
        return;
      }
      objectExpression.properties.push((0, types_12.objectProperty)((0, types_12.identifier)(`${contextObject_12.contextObjectMarker}`), (0, types_12.booleanLiteral)(true)));
    }
    function isImplicitContextObject(path) {
      const propertyPaths = path.get("properties");
      return propertyPaths.some((propertyPath) => {
        if (!propertyPath.isObjectMethod()) {
          return false;
        }
        return hasThisExpression(propertyPath);
      });
    }
    function hasThisExpression(path) {
      let result = false;
      path.traverse({
        ThisExpression(thisPath) {
          result = true;
          thisPath.stop();
        }
      });
      return result;
    }
    function appendWorkletClassMarker(classBody) {
      classBody.body.push((0, types_12.classProperty)((0, types_12.identifier)("__workletClass"), (0, types_12.booleanLiteral)(true)));
    }
    function dehoistCommonJSExports(program) {
      const statements = program.body;
      let end = statements.length;
      let current = 0;
      while (current < end) {
        const statement = statements[current];
        if (!isCommonJSExport(statement)) {
          current++;
          continue;
        }
        const exportStatement = statements.splice(current, 1);
        statements.push(...exportStatement);
        end--;
      }
    }
    function isCommonJSExport(statement) {
      return (0, types_12.isExpressionStatement)(statement) && (0, types_12.isAssignmentExpression)(statement.expression) && (0, types_12.isMemberExpression)(statement.expression.left) && (0, types_12.isIdentifier)(statement.expression.left.object) && statement.expression.left.object.name === "exports";
    }
  }
});

// lib/inlineStylesWarning.js
var require_inlineStylesWarning = __commonJS({
  "lib/inlineStylesWarning.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processInlineStylesWarning = processInlineStylesWarning;
    var types_12 = require("@babel/types");
    var assert_1 = require("assert");
    var utils_1 = require_utils();
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
      if ((0, utils_1.isRelease)()) {
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
  }
});

// lib/webOptimization.js
var require_webOptimization = __commonJS({
  "lib/webOptimization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.substituteWebCallExpression = substituteWebCallExpression;
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
  }
});

// lib/plugin.js
Object.defineProperty(exports, "__esModule", { value: true });
var autoworkletization_1 = require_autoworkletization();
var class_1 = require_class();
var contextObject_1 = require_contextObject();
var file_1 = require_file();
var globals_1 = require_globals();
var inlineStylesWarning_1 = require_inlineStylesWarning();
var types_1 = require_types();
var webOptimization_1 = require_webOptimization();
var workletSubstitution_1 = require_workletSubstitution();
module.exports = function WorkletsBabelPlugin() {
  function runWithTaggedExceptions(fun) {
    try {
      fun();
    } catch (e) {
      const error = e;
      error.message = `[Worklets] Babel plugin exception: ${error.message}`;
      error.name = "WorkletsBabelPluginError";
      throw error;
    }
  }
  return {
    name: "worklets",
    pre() {
      runWithTaggedExceptions(() => {
        (0, globals_1.initializeState)(this);
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
          runWithTaggedExceptions(() => (0, workletSubstitution_1.processIfWithWorkletDirective)(path, state) || (0, autoworkletization_1.processIfAutoworkletizableCallback)(path, state));
        }
      },
      ObjectExpression: {
        enter(path, state) {
          runWithTaggedExceptions(() => {
            (0, contextObject_1.processIfWorkletContextObject)(path, state);
          });
        }
      },
      ClassDeclaration: {
        enter(path, state) {
          runWithTaggedExceptions(() => {
            (0, class_1.processIfWorkletClass)(path, state);
          });
        }
      },
      Program: {
        enter(path, state) {
          runWithTaggedExceptions(() => {
            (0, file_1.processIfWorkletFile)(path, state);
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
//# sourceMappingURL=index.js.map
