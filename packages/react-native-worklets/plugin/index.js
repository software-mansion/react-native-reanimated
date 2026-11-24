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

// lib/directives.js
var require_directives = __commonJS({
  "lib/directives.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.handleWorkletDirective = handleWorkletDirective;
    exports2.addWorkletDirectivesToPath = addWorkletDirectivesToPath;
    exports2.addWorkletDirectivesToFunctionBody = addWorkletDirectivesToFunctionBody;
    exports2.addDirective = addDirective;
    var types_12 = require("@babel/types");
    function handleWorkletDirective(path) {
      if (path.node.value.value === "worklet" && path.parentPath.isBlockStatement()) {
        addDirective(path.parentPath.node, "use no memo");
      }
    }
    function addWorkletDirectivesToPath(path) {
      if (path.isArrowFunctionExpression()) {
        replaceImplicitReturnWithBlock(path.node);
      }
      addWorkletDirectivesToFunctionBody(path.node.body);
    }
    function addWorkletDirectivesToFunctionBody(node) {
      addDirective(node, "worklet");
      addDirective(node, "use no memo");
    }
    function addDirective(node, dir) {
      if (!node.directives.some((functionDirective) => functionDirective.value.value === dir)) {
        node.directives.push((0, types_12.directive)((0, types_12.directiveLiteral)(dir)));
      }
    }
    function replaceImplicitReturnWithBlock(path) {
      if (!(0, types_12.isBlockStatement)(path.body)) {
        path.body = (0, types_12.blockStatement)([(0, types_12.returnStatement)(path.body)]);
      }
    }
  }
});

// lib/types.js
var require_types = __commonJS({
  "lib/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generatedWorkletsDir = exports2.WorkletizableObject = exports2.WorkletizableFunction = void 0;
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
    exports2.generatedWorkletsDir = ".worklets";
  }
});

// lib/referencedWorklets.js
var require_referencedWorklets = __commonJS({
  "lib/referencedWorklets.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.findReferencedWorklet = findReferencedWorklet;
    var types_12 = require("@babel/types");
    var types_2 = require_types();
    function findReferencedWorklet(workletIdentifier, acceptWorkletizableFunction, acceptObject, state) {
      const workletName = workletIdentifier.node.name;
      const scope = workletIdentifier.scope;
      const workletBinding = scope.getBinding(workletName);
      if (!workletBinding) {
        return void 0;
      }
      if (bindingIsWorklet(workletBinding)) {
        return void 0;
      }
      if (acceptWorkletizableFunction && workletBinding.path.isFunctionDeclaration()) {
        return workletBinding.path;
      }
      const isConstant = workletBinding.constant;
      if (isConstant) {
        return findReferencedWorkletFromVariableDeclarator(workletBinding, acceptWorkletizableFunction, acceptObject, state);
      }
      return findReferencedWorkletFromAssignmentExpression(workletBinding, acceptWorkletizableFunction, acceptObject, state);
    }
    function findReferencedWorkletFromVariableDeclarator(workletBinding, acceptWorkletizableFunction, acceptObject, state) {
      const workletDeclaration = workletBinding.path;
      if (!workletDeclaration.isVariableDeclarator()) {
        return void 0;
      }
      const worklet = workletDeclaration.get("init");
      if (acceptWorkletizableFunction && (0, types_2.isWorkletizableFunctionPath)(worklet)) {
        return worklet;
      }
      if (acceptObject && (0, types_2.isWorkletizableObjectPath)(worklet)) {
        return worklet;
      }
      if (worklet.isIdentifier() && worklet.isReferencedIdentifier()) {
        return findReferencedWorklet(worklet, acceptWorkletizableFunction, acceptObject, state);
      }
      return void 0;
    }
    function findReferencedWorkletFromAssignmentExpression(workletBinding, acceptWorkletizableFunction, acceptObject, state) {
      const workletDeclaration = workletBinding.constantViolations.reverse().find((constantViolation) => constantViolation.isAssignmentExpression() && (acceptWorkletizableFunction && (0, types_2.isWorkletizableFunctionPath)(constantViolation.get("right")) || acceptObject && (0, types_2.isWorkletizableObjectPath)(constantViolation.get("right"))));
      if (!workletDeclaration || !workletDeclaration.isAssignmentExpression()) {
        return void 0;
      }
      const workletDefinition = workletDeclaration.get("right");
      if (acceptWorkletizableFunction && (0, types_2.isWorkletizableFunctionPath)(workletDefinition)) {
        return workletDefinition;
      }
      if (acceptObject && (0, types_2.isWorkletizableObjectPath)(workletDefinition)) {
        return workletDefinition;
      }
      if (workletDefinition.isIdentifier() && workletDefinition.isReferencedIdentifier()) {
        return findReferencedWorklet(workletDefinition, acceptWorkletizableFunction, acceptObject, state);
      }
      return void 0;
    }
    function bindingIsWorklet(binding) {
      return binding.referencePaths.some((refPath) => !Array.isArray(refPath.container) && (0, types_12.isMemberExpression)(refPath.container) && refPath.container.object === refPath.node && (0, types_12.isIdentifier)(refPath.container.property) && refPath.container.property.name === "__workletHash");
    }
  }
});

// lib/findWorklet.js
var require_findWorklet = __commonJS({
  "lib/findWorklet.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.findWorklet = findWorklet;
    exports2.forEachWorkletizableFunction = forEachWorkletizableFunction;
    exports2.forEachWorkletizableObjectProperty = forEachWorkletizableObjectProperty;
    var referencedWorklets_1 = require_referencedWorklets();
    var types_12 = require_types();
    function findWorklet(nodePath, state, acceptWorkletizableFunction, acceptObject) {
      if (acceptWorkletizableFunction && (0, types_12.isWorkletizableFunctionPath)(nodePath)) {
        return nodePath;
      }
      if (acceptObject && (0, types_12.isWorkletizableObjectPath)(nodePath)) {
        return nodePath;
      }
      if (nodePath.isIdentifier() && nodePath.isReferencedIdentifier()) {
        const worklet = (0, referencedWorklets_1.findReferencedWorklet)(nodePath, acceptWorkletizableFunction, acceptObject, state);
        return worklet;
      }
      return void 0;
    }
    function forEachWorkletizableFunction(arg, state, acceptWorkletizableFunction, acceptObject, callback) {
      const maybeWorklet = findWorklet(arg, state, acceptWorkletizableFunction, acceptObject);
      if (!maybeWorklet) {
        return;
      }
      if ((0, types_12.isWorkletizableFunctionPath)(maybeWorklet)) {
        callback(maybeWorklet);
      } else if ((0, types_12.isWorkletizableObjectPath)(maybeWorklet)) {
        forEachWorkletizableObjectProperty(maybeWorklet, state, callback);
      }
    }
    function forEachWorkletizableObjectProperty(path, state, callback) {
      const properties = path.get("properties");
      for (const property of properties) {
        if (property.isObjectMethod()) {
          callback(property);
        } else if (property.isObjectProperty()) {
          const value = property.get("value");
          forEachWorkletizableFunction(value, state, true, false, callback);
        } else {
          throw new Error(`'${property.type}' as to-be workletized argument is not supported for object hooks.`);
        }
      }
    }
  }
});

// lib/gestureHandlerAutoworkletization.js
var require_gestureHandlerAutoworkletization = __commonJS({
  "lib/gestureHandlerAutoworkletization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.gestureHandlerObjectHooks = exports2.gestureHandlerBuilderMethods = void 0;
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
    exports2.gestureHandlerObjectHooks = /* @__PURE__ */ new Set([
      "useTapGesture",
      "usePanGesture",
      "usePinchGesture",
      "useRotationGesture",
      "useFlingGesture",
      "useLongPressGesture",
      "useNativeGesture",
      "useManualGesture",
      "useHoverGesture"
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
      ...LayoutTransitions,
      "SharedTransition"
    ]);
    var BaseAnimationsChainableMethods = /* @__PURE__ */ new Set([
      "build",
      "duration",
      "delay",
      "getDuration",
      "randomDelay",
      "getDelay",
      "getDelayFunction",
      "reduceMotion",
      "withCallback"
    ]);
    var ComplexAnimationsChainableMethods = /* @__PURE__ */ new Set([
      "easing",
      "rotate",
      "springify",
      "dampingRatio",
      "damping",
      "mass",
      "stiffness",
      "overshootClamping",
      "energyThreshold",
      "restDisplacementThreshold",
      "restSpeedThreshold",
      "withInitialValues",
      "withTargetValues",
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
    var SharedTransitionChainableMethods = /* @__PURE__ */ new Set([
      "fadeContent",
      "custom",
      "progressAnimation",
      "defaultTransitionType"
    ]);
    var LayoutAnimationsChainableMethods = /* @__PURE__ */ new Set([
      ...BaseAnimationsChainableMethods,
      ...ComplexAnimationsChainableMethods,
      ...DefaultTransitionChainableMethods,
      ...SharedTransitionChainableMethods
    ]);
    var LayoutAnimationsCallbacks = /* @__PURE__ */ new Set([
      "withCallback",
      "custom",
      "progressAnimation"
    ]);
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

// lib/autoworkletization.js
var require_autoworkletization = __commonJS({
  "lib/autoworkletization.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.addDirectivesToKnownCallback = addDirectivesToKnownCallback;
    exports2.handleWorkletizableCallback = handleWorkletizableCallback;
    var types_12 = require("@babel/types");
    var directives_12 = require_directives();
    var findWorklet_1 = require_findWorklet();
    var gestureHandlerAutoworkletization_1 = require_gestureHandlerAutoworkletization();
    var layoutAnimationAutoworkletization_1 = require_layoutAnimationAutoworkletization();
    var reanimatedObjectHooks = /* @__PURE__ */ new Set([
      "useAnimatedScrollHandler",
      ...Array.from(gestureHandlerAutoworkletization_1.gestureHandlerObjectHooks)
    ]);
    var reanimatedFunctionHooks = /* @__PURE__ */ new Set([
      "useFrameCallback",
      "useAnimatedStyle",
      "useAnimatedProps",
      "createAnimatedPropAdapter",
      "useDerivedValue",
      "useAnimatedScrollHandler",
      "useAnimatedReaction",
      // animations' callbacks
      "withTiming",
      "withSpring",
      "withDecay",
      "withRepeat",
      // scheduling functions
      "runOnUI",
      "executeOnUIRuntimeSync",
      "scheduleOnUI",
      "runOnUISync",
      "runOnUIAsync",
      "runOnRuntime",
      "runOnRuntimeSync",
      "runOnRuntimeAsync",
      "scheduleOnRuntime",
      "runOnRuntimeSyncWithId",
      "runOnRuntimeAsyncWithId",
      "scheduleOnRuntimeWithId",
      // runtime creation
      "createWorkletRuntime"
    ]);
    var reanimatedFunctionArgsToWorkletize = new Map([
      ["useFrameCallback", [0]],
      ["useAnimatedStyle", [0]],
      ["useAnimatedProps", [0]],
      ["createAnimatedPropAdapter", [0]],
      ["useDerivedValue", [0]],
      ["useAnimatedScrollHandler", [0]],
      ["useAnimatedReaction", [0, 1]],
      ["withTiming", [2, 3]],
      ["withSpring", [2, 3]],
      ["withDecay", [1]],
      ["withRepeat", [3]],
      ["runOnUI", [0]],
      ["executeOnUIRuntimeSync", [0]],
      ["scheduleOnUI", [0]],
      ["runOnUISync", [0]],
      ["runOnUIAsync", [0]],
      ["runOnRuntime", [1]],
      ["runOnRuntimeSync", [1]],
      ["runOnRuntimeAsync", [1]],
      ["scheduleOnRuntime", [1]],
      ["runOnRuntimeSyncWithId", [1]],
      ["runOnRuntimeAsyncWithId", [1]],
      ["scheduleOnRuntimeWithId", [1]],
      ["createWorkletRuntime", [1]],
      ...Array.from(gestureHandlerAutoworkletization_1.gestureHandlerObjectHooks).map((name) => [name, [0]]),
      ...Array.from(gestureHandlerAutoworkletization_1.gestureHandlerBuilderMethods).map((name) => [name, [0]])
    ]);
    var configPropertiesToWorkletize = /* @__PURE__ */ new Map([
      ["createWorkletRuntime", { argIndex: 0, keys: ["initializer"] }],
      [
        "createShareable",
        { argIndex: 2, keys: ["hostDecorator", "guestDecorator"] }
      ],
      [
        "registerCustomSerializable",
        { argIndex: 0, keys: ["determine", "pack", "unpack"] }
      ],
      ["withTiming", { argIndex: 1, keys: ["easing"] }],
      ["useHandler", { argIndex: 0, keys: null }]
    ]);
    function addDirectivesToKnownCallback(path) {
      if ((0, gestureHandlerAutoworkletization_1.isGestureHandlerEventCallback)(path) || (0, layoutAnimationAutoworkletization_1.isLayoutAnimationCallback)(path)) {
        (0, directives_12.addWorkletDirectivesToPath)(path);
      }
    }
    function handleWorkletizableCallback(path, state) {
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
        addDirectivesToArgs(args, state, acceptWorkletizableFunction, acceptObject);
      } else if (!(0, types_12.isV8IntrinsicIdentifier)(callee) && (0, gestureHandlerAutoworkletization_1.isGestureObjectEventCallbackMethod)(callee)) {
        const args = path.get("arguments");
        addDirectivesToArgs(args, state, true, true);
      }
      const configProperties = configPropertiesToWorkletize.get(name);
      if (configProperties) {
        addDirectivesToConfigProperties(path.get("arguments")[configProperties.argIndex], configProperties.keys, state);
      }
    }
    function addDirectivesToConfigProperties(config, keys, state) {
      if (!(config === null || config === void 0 ? void 0 : config.isObjectExpression())) {
        return;
      }
      for (const property of config.get("properties")) {
        if (!(property.isObjectMethod() || property.isObjectProperty()) || property.node.computed) {
          continue;
        }
        const key = property.node.key;
        const keyName = (0, types_12.isIdentifier)(key) ? key.name : (0, types_12.isStringLiteral)(key) ? key.value : void 0;
        if (keyName === void 0 || keys && !keys.includes(keyName)) {
          continue;
        }
        if (property.isObjectMethod()) {
          if (property.node.kind === "method") {
            (0, directives_12.addWorkletDirectivesToPath)(property);
          }
        } else if (property.isObjectProperty()) {
          (0, findWorklet_1.forEachWorkletizableFunction)(property.get("value"), state, true, false, directives_12.addWorkletDirectivesToPath);
        }
      }
    }
    function addDirectivesToArgs(args, state, acceptWorkletizableFunction, acceptObject) {
      args.forEach((arg) => {
        (0, findWorklet_1.forEachWorkletizableFunction)(arg, state, acceptWorkletizableFunction, acceptObject, directives_12.addWorkletDirectivesToPath);
      });
    }
  }
});

// lib/classMethod.js
var require_classMethod = __commonJS({
  "lib/classMethod.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processIfWorkletMethod = processIfWorkletMethod;
    var types_12 = require("@babel/types");
    var assert_1 = require("assert");
    function processIfWorkletMethod(path) {
      if (path.node.kind !== "method") {
        return;
      }
      if (path.node.body.directives.some((d) => d.value.value === "worklet")) {
        (0, assert_1.strict)((0, types_12.isIdentifier)(path.node.key), "ClassMethod key must be an Identifier");
        const methodIdentifier = path.node.key;
        path.replaceWith((0, types_12.classProperty)((0, types_12.cloneNode)(methodIdentifier, true), (0, types_12.functionExpression)((0, types_12.cloneNode)(methodIdentifier, true), path.node.params.filter((p) => (0, types_12.isFunctionParameter)(p)).map((p) => (0, types_12.cloneNode)(p, true)), (0, types_12.cloneNode)(path.node.body, true), path.node.generator, path.node.async), null, null, path.node.computed, path.node.static));
      }
    }
  }
});

// lib/imports.js
var require_imports = __commonJS({
  "lib/imports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.COMMON_FOLDER_NAMES = void 0;
    exports2.updateRelativeRequires = updateRelativeRequires;
    exports2.isImport = isImport;
    exports2.isImportRelative = isImportRelative;
    exports2.canForwardModuleImport = canForwardModuleImport;
    exports2.canForwardRelativeImport = canForwardRelativeImport;
    exports2.createImportPathLiteral = createImportPathLiteral;
    exports2.warnAboutDangerousRelativePaths = warnAboutDangerousRelativePaths;
    exports2.isDangerousRelativePath = isDangerousRelativePath;
    var core_1 = require("@babel/core");
    var types_12 = require("@babel/types");
    var path_1 = require("path");
    var types_2 = require_types();
    function updateRelativeRequires(node, state) {
      (0, core_1.traverse)(node, {
        noScope: true,
        CallExpression(nodePath) {
          const specifier = nodePath.get("arguments")[0];
          if (!(specifier === null || specifier === void 0 ? void 0 : specifier.isStringLiteral()) || !specifier.node.value.startsWith(".")) {
            return;
          }
          const callee = nodePath.get("callee");
          if (callee.isImport() || callee.isIdentifier({ name: "require" })) {
            specifier.replaceWith(createImportPathLiteral(specifier.node.value, state));
          }
        }
      });
    }
    function isImport(binding) {
      return binding.kind === "module" && binding.constant && (binding.path.isImportSpecifier() || binding.path.isImportDefaultSpecifier()) && binding.path.parentPath.isImportDeclaration();
    }
    function isImportRelative(imported) {
      return imported.path.parentPath.node.source.value.startsWith(".");
    }
    function canForwardModuleImport(moduleName, forwardableModuleNames) {
      return forwardableModuleNames.includes(moduleName);
    }
    function canForwardRelativeImport(modulePath, relativePaths) {
      return !!modulePath && relativePaths.some((relativePath) => matchesFilenameSegment(modulePath, relativePath));
    }
    function matchesFilenameSegment(filename, allowedPath) {
      const pkgSegments = allowedPath.split(path_1.posix.sep);
      let fileSegments = filename.split(path_1.sep);
      const lastNodeModules = fileSegments.lastIndexOf("node_modules");
      if (lastNodeModules !== -1) {
        fileSegments = fileSegments.slice(lastNodeModules + 1);
      }
      for (let i = 0; i <= fileSegments.length - pkgSegments.length; i++) {
        if (pkgSegments.every((segment, segmentIndex) => fileSegments[i + segmentIndex] === segment)) {
          return true;
        }
      }
      return false;
    }
    function createImportPathLiteral(originalPath, state) {
      const generatedWorkletsDirPath = (0, path_1.resolve)((0, path_1.dirname)(require.resolve("react-native-worklets/package.json")), types_2.generatedWorkletsDir);
      const resolved = (0, path_1.resolve)((0, path_1.dirname)(state.file.opts.filename), originalPath);
      const relativePath = (0, path_1.relative)(generatedWorkletsDirPath, resolved);
      return (0, types_12.stringLiteral)(path_1.sep === "/" ? relativePath : relativePath.split(path_1.sep).join("/"));
    }
    exports2.COMMON_FOLDER_NAMES = /* @__PURE__ */ new Set([
      "app",
      "build",
      "cjs",
      "common",
      "commonjs",
      "components",
      "core",
      "dist",
      "esm",
      "helpers",
      "lib",
      "module",
      "modules",
      "shared",
      "source",
      "src",
      "utils"
    ]);
    var warnedDangerousPaths = /* @__PURE__ */ new Set();
    function warnAboutDangerousRelativePaths(relativePaths, silenced) {
      if (silenced || !relativePaths) {
        return;
      }
      for (const relativePath of relativePaths) {
        if (typeof relativePath !== "string" || warnedDangerousPaths.has(relativePath) || !isDangerousRelativePath(relativePath)) {
          continue;
        }
        warnedDangerousPaths.add(relativePath);
        console.warn(getDangerousRelativePathWarning(relativePath));
      }
    }
    function isDangerousRelativePath(relativePath) {
      const segments = relativePath.split(path_1.posix.sep);
      return relativePath.length > 0 && segments.every((segment) => exports2.COMMON_FOLDER_NAMES.has(segment));
    }
    function getDangerousRelativePathWarning(relativePath) {
      return `[Worklets] \`importForwarding.relativePaths\` contains '${relativePath}', which has only common folder names. It can also match folders inside packages in node_modules, for example 'node_modules/<package>/${relativePath}', and the relative imports inside their worklets get forwarded too, which can crash the app. Use a path that only your code has. Set the \`silenceDangerousPathsWarning\` plugin option to \`true\` to hide this warning. See https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#importforwardingrelativepaths`;
    }
  }
});

// lib/globals.js
var require_globals = __commonJS({
  "lib/globals.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.initializeState = initializeState;
    exports2.isGeneratedWorkletFile = isGeneratedWorkletFile;
    var assert_1 = require("assert");
    var path_1 = __importDefault(require("path"));
    var imports_1 = require_imports();
    var types_12 = require_types();
    function initializeState(state, workletModules) {
      var _a, _b;
      state.skipFile = isGeneratedWorkletFile(state.file.opts.filename);
      if (state.skipFile) {
        return;
      }
      state.workletModules = workletModules;
      state.workletNumber = 1;
      const userImportForwarding = state.opts.importForwarding;
      (0, imports_1.warnAboutDangerousRelativePaths)(userImportForwarding === null || userImportForwarding === void 0 ? void 0 : userImportForwarding.relativePaths, state.opts.silenceDangerousPathsWarning);
      (0, assert_1.strict)(state.importForwarding === void 0, "state.importForwarding should be undefined at this point");
      state.importForwarding = {
        relativePaths: [
          ...defaultAllowedPaths,
          ...(_a = userImportForwarding === null || userImportForwarding === void 0 ? void 0 : userImportForwarding.relativePaths) !== null && _a !== void 0 ? _a : []
        ],
        moduleNames: [
          ...defaultAllowedModules,
          ...(_b = userImportForwarding === null || userImportForwarding === void 0 ? void 0 : userImportForwarding.moduleNames) !== null && _b !== void 0 ? _b : []
        ]
      };
    }
    function isGeneratedWorkletFile(filename) {
      if (!filename) {
        return false;
      }
      const generatedWorkletsDirPath = path_1.default.join("react-native-worklets", types_12.generatedWorkletsDir);
      return filename.includes(generatedWorkletsDirPath);
    }
    var defaultAllowedPaths = ["react-native-worklets"];
    var defaultAllowedModules = ["react-native-worklets"];
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
    function isRelease(state) {
      var _a, _b;
      const releasePattern = /(prod|release|stag[ei])/i;
      const developmentPattern = /dev/i;
      const envName = state.file.opts.envName;
      if (envName) {
        if (envName.match(releasePattern)) {
          return true;
        }
        if (envName.match(developmentPattern)) {
          return false;
        }
      }
      return !!(((_a = process.env.BABEL_ENV) === null || _a === void 0 ? void 0 : _a.match(releasePattern)) || ((_b = process.env.NODE_ENV) === null || _b === void 0 ? void 0 : _b.match(releasePattern)));
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

// lib/closure.js
var require_closure = __commonJS({
  "lib/closure.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getClosure = getClosure;
    var types_12 = require("@babel/types");
    var imports_1 = require_imports();
    function toClosureIdentifier(node) {
      return (0, types_12.isJSXIdentifier)(node) ? (0, types_12.identifier)(node.name) : (0, types_12.cloneNode)(node, true);
    }
    function getClosure(funPath, state) {
      const capturedNames = /* @__PURE__ */ new Set();
      const closureVariables = new Array();
      const moduleBindingsToImport = /* @__PURE__ */ new Set();
      const relativeBindingsToImport = /* @__PURE__ */ new Set();
      let recrawled = false;
      funPath.traverse({
        "TSType|TSTypeAliasDeclaration|TSInterfaceDeclaration"(typePath) {
          typePath.skip();
        },
        ReferencedIdentifier(idPath) {
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
          if ((0, imports_1.isImport)(binding)) {
            if ((0, imports_1.isImportRelative)(binding) && (0, imports_1.canForwardRelativeImport)(state.filename, state.importForwarding.relativePaths)) {
              capturedNames.add(name);
              relativeBindingsToImport.add(binding);
              return;
            }
            const source = binding.path.parentPath.node.source.value;
            if ((0, imports_1.canForwardModuleImport)(source, state.importForwarding.moduleNames)) {
              capturedNames.add(name);
              moduleBindingsToImport.add(binding);
              return;
            }
          }
          capturedNames.add(name);
          closureVariables.push(toClosureIdentifier(idPath.node));
        }
      }, state);
      return {
        closureVariables,
        moduleBindingsToImport,
        relativeBindingsToImport
      };
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
    var imports_1 = require_imports();
    var types_2 = require_types();
    function generateWorkletFile(moduleBindingsToImport, relativeBindingsToImport, factory, workletHash, state) {
      var _a, _b;
      const libraryImports = Array.from(moduleBindingsToImport).filter((binding) => (binding.path.isImportSpecifier() || binding.path.isImportDefaultSpecifier()) && binding.path.parentPath.isImportDeclaration()).map((binding) => (0, types_12.importDeclaration)([(0, types_12.cloneNode)(binding.path.node, true)], (0, types_12.stringLiteral)(binding.path.parentPath.node.source.value)));
      const filesDirPath = (0, path_1.resolve)((0, path_1.dirname)(require.resolve("react-native-worklets/package.json")), types_2.generatedWorkletsDir);
      const relativeImports = Array.from(relativeBindingsToImport).filter((binding) => binding.path.isImportSpecifier() && binding.path.parentPath.isImportDeclaration()).map((binding) => (0, types_12.importDeclaration)([(0, types_12.cloneNode)(binding.path.node, true)], (0, imports_1.createImportPathLiteral)(binding.path.parentPath.node.source.value, state)));
      const imports = [...libraryImports, ...relativeImports];
      const statements = [...factory.body.body];
      const returnedWorklet = statements.pop();
      (0, assert_1.default)((0, types_12.isReturnStatement)(returnedWorklet) && returnedWorklet.argument);
      const newProg = (0, types_12.program)([
        ...imports,
        ...factory.params.length === 0 ? [...statements, (0, types_12.exportDefaultDeclaration)(returnedWorklet.argument)] : [(0, types_12.exportDefaultDeclaration)(factory)]
      ]);
      const transformedProg = (_a = (0, core_1.transformFromAstSync)(newProg, void 0, {
        filename: state.file.opts.filename,
        presets: [resolvePresetTypescript()],
        plugins: [stripJsxDevAttributesPlugin],
        ast: false,
        babelrc: false,
        configFile: false,
        comments: false
      })) === null || _a === void 0 ? void 0 : _a.code;
      (0, assert_1.default)(transformedProg, "[Worklets] `transformedProg` is undefined.");
      const dedicatedFilePath = (0, path_1.resolve)(filesDirPath, `${workletHash}.js`);
      const output = process.env.WORKLETS_WRITE_ORIGIN ? `// __workletOrigin: ${(_b = state.file.opts.filename) !== null && _b !== void 0 ? _b : "unknown"}
${transformedProg}` : transformedProg;
      const temporaryFilePath = `${dedicatedFilePath}.${process.pid}.tmp`;
      (0, fs_1.writeFileSync)(temporaryFilePath, output);
      (0, fs_1.renameSync)(temporaryFilePath, dedicatedFilePath);
    }
    function resolvePresetTypescript() {
      try {
        return require.resolve("@babel/preset-typescript");
      } catch (_a) {
        return require.resolve("@babel/preset-typescript", {
          paths: [(0, path_1.dirname)(require.resolve("react-native-worklets/package.json"))]
        });
      }
    }
    var stripJsxDevAttributesPlugin = {
      name: "worklets-strip-jsx-dev-attributes",
      visitor: {
        JSXAttribute(path) {
          const name = path.node.name;
          if (name.type !== "JSXIdentifier") {
            return;
          }
          if (name.name !== "__self" && name.name !== "__source") {
            return;
          }
          path.remove();
        }
      }
    };
  }
});

// lib/workletFactory.js
var require_workletFactory = __commonJS({
  "lib/workletFactory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeWorkletFactory = makeWorkletFactory;
    var types_12 = require("@babel/types");
    var assert_1 = require("assert");
    var path_1 = require("path");
    var closure_1 = require_closure();
    var generate_1 = require_generate();
    var imports_1 = require_imports();
    var utils_1 = require_utils();
    var REAL_VERSION = require("../package.json").version;
    var MOCK_VERSION = "x.y.z";
    function makeWorkletFactory(fun, state) {
      stripWorkletDirectives(fun);
      (0, assert_1.strict)(state.file.opts.filename, "`state.file.opts.filename` is undefined.");
      const { closureVariables, moduleBindingsToImport, relativeBindingsToImport } = (0, closure_1.getClosure)(fun, state);
      const clone = (0, types_12.cloneNode)(fun.node);
      const funExpression = (0, types_12.isBlockStatement)(clone.body) ? (0, types_12.functionExpression)(null, clone.params, clone.body, clone.generator, clone.async) : clone;
      const { workletName, reactName: initialReactName } = makeWorkletName(fun, state);
      let reactName = initialReactName;
      const importedNames = new Set([...moduleBindingsToImport, ...relativeBindingsToImport].map((binding) => binding.identifier.name));
      let factoryName = `${workletName}Factory`;
      while (importedNames.has(factoryName)) {
        factoryName = `_${factoryName}`;
      }
      if (closureVariables.length === 0) {
        while (importedNames.has(reactName)) {
          reactName = `_${reactName}`;
        }
      }
      const workletHash = hash(makeWorkletHashKey(fun, state));
      (0, assert_1.strict)(!(0, types_12.isFunctionDeclaration)(funExpression), "`funExpression` is a `FunctionDeclaration`.");
      (0, assert_1.strict)(!(0, types_12.isObjectMethod)(funExpression), "`funExpression` is an `ObjectMethod`.");
      const statements = [
        (0, types_12.variableDeclaration)("const", [
          (0, types_12.variableDeclarator)((0, types_12.identifier)(reactName), funExpression)
        ]),
        ...closureVariables.length > 0 ? [
          (0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(reactName), (0, types_12.identifier)("__closure"), false), (0, types_12.arrayExpression)(closureVariables.map((variable) => (0, types_12.cloneNode)(variable, true)))))
        ] : [],
        (0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(reactName), (0, types_12.identifier)("__workletHash"), false), (0, types_12.numericLiteral)(workletHash)))
      ];
      const shouldInjectVersion = !(0, utils_1.isRelease)(state);
      if (shouldInjectVersion) {
        statements.push((0, types_12.expressionStatement)((0, types_12.assignmentExpression)("=", (0, types_12.memberExpression)((0, types_12.identifier)(reactName), (0, types_12.identifier)("__pluginVersion")), (0, types_12.stringLiteral)(shouldMockVersion() ? MOCK_VERSION : REAL_VERSION))));
      }
      statements.push((0, types_12.returnStatement)((0, types_12.identifier)(reactName)));
      const factoryParams = closureVariables.map((variableId) => (0, types_12.cloneNode)(variableId, true));
      const factory = (0, types_12.functionExpression)((0, types_12.identifier)(factoryName), factoryParams.length > 0 ? [(0, types_12.arrayPattern)(factoryParams.map((param) => (0, types_12.cloneNode)(param, true)))] : [], (0, types_12.blockStatement)(statements));
      const factoryCallArgs = factoryParams.map((param) => (0, types_12.cloneNode)(param, true));
      const factoryCallParamPack = (0, types_12.arrayExpression)(factoryCallArgs);
      if (state.workletModules === "file") {
        (0, imports_1.updateRelativeRequires)(factory, state);
        (0, generate_1.generateWorkletFile)(moduleBindingsToImport, relativeBindingsToImport, factory, workletHash, state);
      }
      return { factory, factoryCallParamPack, workletHash };
    }
    function stripWorkletDirectives(fun) {
      fun.traverse({
        DirectiveLiteral(nodePath) {
          if ((nodePath.node.value === "worklet" || nodePath.node.value === "no-worklet-closure") && nodePath.getFunctionParent() === fun) {
            nodePath.parentPath.remove();
          }
        }
      });
    }
    function shouldMockVersion() {
      return process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION === "1";
    }
    function makeWorkletHashKey(fun, state) {
      var _a;
      const filename = state.file.opts.filename;
      const cwd = (_a = state.file.opts.cwd) !== null && _a !== void 0 ? _a : process.cwd();
      const source = filename ? (0, path_1.relative)(cwd, filename).split(path_1.sep).join("/") : "unknownFile";
      const position = fun.node.body.start;
      return position === null || position === void 0 ? `${source}#${state.workletNumber}` : `${source}:${position}`;
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
        const splitFilepath = filepath.split(/[\\/]/);
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
      if (state.workletModules === "in-place") {
        const inPlaceCall = (0, types_12.callExpression)(factory, factoryCallParamPack.elements.length === 0 ? [] : [factoryCallParamPack]);
        addStackTraceDataToWorkletFactory(path, inPlaceCall);
        return inPlaceCall;
      }
      const workletModule = (0, types_12.memberExpression)((0, types_12.callExpression)((0, types_12.identifier)("require"), [
        (0, types_12.stringLiteral)(`react-native-worklets/${types_2.generatedWorkletsDir}/${workletHash}.js`)
      ]), (0, types_12.identifier)("default"));
      if (factoryCallParamPack.elements.length === 0) {
        workletModule.loc = path.node.loc;
        return workletModule;
      }
      const factoryCall = (0, types_12.callExpression)(workletModule, [factoryCallParamPack]);
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
        // @ts-expect-error TypeScript doesn't like this syntax here.
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

// lib/plugin.js
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutoworkletizationMicroPlugin = getAutoworkletizationMicroPlugin;
var autoworkletization_1 = require_autoworkletization();
var classMethod_1 = require_classMethod();
var directives_1 = require_directives();
var globals_1 = require_globals();
var types_1 = require_types();
var workletSubstitution_1 = require_workletSubstitution();
module.exports = function WorkletsBabelPlugin(api) {
  const workletModules = api.caller((caller) => isMetroCaller(caller) ? "file" : "in-place");
  function runWithTaggedExceptions(state, fun) {
    if (state.skipFile) {
      return;
    }
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
      runWithTaggedExceptions(this, () => {
        (0, globals_1.initializeState)(this, workletModules);
        this.file.path.traverse(getAutoworkletizationMicroPlugin(), this);
      });
    },
    visitor: {
      [types_1.WorkletizableFunction]: {
        enter(path, state) {
          runWithTaggedExceptions(state, () => {
            (0, workletSubstitution_1.processIfWithWorkletDirective)(path, state);
          });
        }
      },
      ClassMethod: {
        enter(path, state) {
          runWithTaggedExceptions(state, () => {
            (0, classMethod_1.processIfWorkletMethod)(path);
          });
        }
      }
    }
  };
};
function getAutoworkletizationMicroPlugin() {
  return {
    CallExpression: {
      enter(path, state) {
        (0, autoworkletization_1.handleWorkletizableCallback)(path, state);
      }
    },
    [types_1.WorkletizableFunction]: {
      enter(path) {
        (0, autoworkletization_1.addDirectivesToKnownCallback)(path);
      }
    },
    Directive: {
      enter(path) {
        (0, directives_1.handleWorkletDirective)(path);
      }
    }
  };
}
function isMetroCaller(caller) {
  return (caller === null || caller === void 0 ? void 0 : caller.bundler) === "metro" || (caller === null || caller === void 0 ? void 0 : caller.name) === "metro";
}
//# sourceMappingURL=index.js.map
