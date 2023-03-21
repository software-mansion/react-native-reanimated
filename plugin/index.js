"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BabelTypes = __importStar(require("@babel/types"));
const generator_1 = __importDefault(require("@babel/generator"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const core_1 = require("@babel/core");
const fs = __importStar(require("fs"));
const convertSourceMap = __importStar(require("convert-source-map"));
const package_json_1 = __importDefault(require("../package.json"));
function hash(str) {
    let i = str.length;
    let hash1 = 5381;
    let hash2 = 52711;
    while (i--) {
        const char = str.charCodeAt(i);
        hash1 = (hash1 * 33) ^ char;
        hash2 = (hash2 * 33) ^ char;
    }
    return (hash1 >>> 0) * 4096 + (hash2 >>> 0);
}
const functionArgsToWorkletize = new Map([
    ['useFrameCallback', [0]],
    ['useAnimatedStyle', [0]],
    ['useAnimatedProps', [0]],
    ['createAnimatedPropAdapter', [0]],
    ['useDerivedValue', [0]],
    ['useAnimatedScrollHandler', [0]],
    ['useAnimatedReaction', [0, 1]],
    ['useWorkletCallback', [0]],
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
    'performance',
    'Date',
    'Array',
    'ArrayBuffer',
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Uint16Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
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
    'setImmediate',
    '_WORKLET',
    'arguments',
    'Boolean',
    'parseInt',
    'parseFloat',
    'Map',
    'WeakMap',
    'WeakRef',
    'Set',
    '_log',
    '_scheduleOnJS',
    '_makeShareableClone',
    '_updateDataSynchronously',
    'eval',
    '_updatePropsPaper',
    '_updatePropsFabric',
    '_removeShadowNodeFromRegistry',
    'RegExp',
    'Error',
    'ErrorUtils',
    'global',
    '_measure',
    '_scrollTo',
    '_dispatchCommand',
    '_setGestureState',
    '_getCurrentTime',
    'isNaN',
    'LayoutAnimationRepository',
    '_notifyAboutProgress',
    '_notifyAboutEnd',
]);
const gestureHandlerGestureObjects = new Set([
    'Tap',
    'Pan',
    'Pinch',
    'Rotation',
    'Fling',
    'LongPress',
    'ForceTouch',
    'Native',
    'Manual',
    'Race',
    'Simultaneous',
    'Exclusive',
]);
const gestureHandlerBuilderMethods = new Set([
    'onBegin',
    'onStart',
    'onEnd',
    'onFinalize',
    'onUpdate',
    'onChange',
    'onTouchesDown',
    'onTouchesMove',
    'onTouchesUp',
    'onTouchesCancelled',
]);
function isRelease() {
    return (process.env.BABEL_ENV &&
        ['production', 'release'].includes(process.env.BABEL_ENV));
}
function shouldGenerateSourceMap() {
    if (isRelease()) {
        return false;
    }
    if (process.env.REANIMATED_PLUGIN_TESTS === 'jest') {
        return false;
    }
    return true;
}
function buildWorkletString(t, fun, closureVariables, name, inputMap) {
    function prependClosureVariablesIfNecessary() {
        const closureDeclaration = t.variableDeclaration('const', [
            t.variableDeclarator(t.objectPattern(closureVariables.map((variable) => t.objectProperty(t.identifier(variable.name), t.identifier(variable.name), false, true))), t.memberExpression(t.thisExpression(), t.identifier('_closure'))),
        ]);
        function prependClosure(path) {
            if (closureVariables.length === 0 || path.parent.type !== 'Program') {
                return;
            }
            if (!BabelTypes.isExpression(path.node.body))
                path.node.body.body.unshift(closureDeclaration);
        }
        function prependRecursiveDeclaration(path) {
            var _a;
            if (path.parent.type === 'Program' &&
                !BabelTypes.isArrowFunctionExpression(path.node) &&
                !BabelTypes.isObjectMethod(path.node) &&
                path.node.id &&
                path.scope.parent) {
                const hasRecursiveCalls = ((_a = path.scope.parent.bindings[path.node.id.name]) === null || _a === void 0 ? void 0 : _a.references) > 0;
                if (hasRecursiveCalls) {
                    path.node.body.body.unshift(t.variableDeclaration('const', [
                        t.variableDeclarator(t.identifier(path.node.id.name), t.memberExpression(t.thisExpression(), t.identifier('_recur'))),
                    ]));
                }
            }
        }
        return {
            visitor: {
                'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod': (path) => {
                    prependClosure(path);
                    prependRecursiveDeclaration(path);
                },
            },
        };
    }
    const draftExpression = (fun.program.body.find((obj) => BabelTypes.isFunctionDeclaration(obj)) ||
        fun.program.body.find((obj) => BabelTypes.isExpressionStatement(obj)) ||
        undefined);
    if (!draftExpression)
        throw new Error("'draftExpression' is not defined\n");
    const expression = BabelTypes.isFunctionDeclaration(draftExpression)
        ? draftExpression
        : draftExpression.expression;
    if (!('params' in expression && BabelTypes.isBlockStatement(expression.body)))
        throw new Error("'expression' doesn't have property 'params' or 'expression.body' is not a BlockStatmenent\n'");
    const workletFunction = BabelTypes.functionExpression(BabelTypes.identifier(name), expression.params, expression.body);
    const code = (0, generator_1.default)(workletFunction).code;
    if (!inputMap)
        throw new Error("'inputMap' is not defined");
    const includeSourceMap = shouldGenerateSourceMap();
    if (includeSourceMap) {
        inputMap.sourcesContent = [];
        for (const sourceFile of inputMap.sources) {
            inputMap.sourcesContent.push(fs.readFileSync(sourceFile).toString('utf-8'));
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
        comments: false,
    });
    if (!transformed)
        throw new Error('transformed is null!\n');
    let sourceMap;
    if (includeSourceMap) {
        sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
        delete sourceMap.sourcesContent;
    }
    return [transformed.code, JSON.stringify(sourceMap)];
}
function makeWorkletName(t, fun) {
    if (t.isObjectMethod(fun.node) && 'name' in fun.node.key) {
        return fun.node.key.name;
    }
    if (t.isFunctionDeclaration(fun.node) && fun.node.id) {
        return fun.node.id.name;
    }
    if (BabelTypes.isFunctionExpression(fun.node) &&
        BabelTypes.isIdentifier(fun.node.id)) {
        return fun.node.id.name;
    }
    return 'anonymous';
}
function makeWorklet(t, fun, state) {
    const functionName = makeWorkletName(t, fun);
    const closure = new Map();
    fun.traverse({
        DirectiveLiteral(path) {
            if (path.node.value === 'worklet' && path.getFunctionParent() === fun) {
                path.parentPath.remove();
            }
        },
    });
    if (!state.file.opts.filename)
        throw new Error("'state.file.opts.filename' is undefined\n");
    const codeObject = (0, generator_1.default)(fun.node, {
        sourceMaps: true,
        sourceFileName: state.file.opts.filename,
    });
    const code = '(' + (t.isObjectMethod(fun) ? 'function ' : '') + codeObject.code + '\n)';
    const transformed = (0, core_1.transformSync)(code, {
        filename: state.file.opts.filename,
        presets: ['@babel/preset-typescript'],
        plugins: [
            '@babel/plugin-transform-shorthand-properties',
            '@babel/plugin-transform-arrow-functions',
            '@babel/plugin-proposal-optional-chaining',
            '@babel/plugin-proposal-nullish-coalescing-operator',
            ['@babel/plugin-transform-template-literals', { loose: true }],
        ],
        ast: true,
        babelrc: false,
        configFile: false,
        inputSourceMap: codeObject.map,
    });
    if (!transformed || !transformed.ast)
        throw new Error("'transformed' or 'transformed.ast' is undefined\n");
    (0, traverse_1.default)(transformed.ast, {
        Identifier(path) {
            if (!path.isReferencedIdentifier())
                return;
            const name = path.node.name;
            if (globals.has(name) ||
                (!BabelTypes.isArrowFunctionExpression(fun.node) &&
                    !BabelTypes.isObjectMethod(fun.node) &&
                    fun.node.id &&
                    fun.node.id.name === name)) {
                return;
            }
            const parentNode = path.parent;
            if (parentNode.type === 'MemberExpression' &&
                parentNode.property === path.node &&
                !parentNode.computed) {
                return;
            }
            if (parentNode.type === 'ObjectProperty' &&
                path.parentPath.parent.type === 'ObjectExpression' &&
                path.node !== parentNode.value) {
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
    });
    const variables = Array.from(closure.values());
    const privateFunctionId = t.identifier('_f');
    const clone = t.cloneNode(fun.node);
    const funExpression = BabelTypes.isBlockStatement(clone.body)
        ? BabelTypes.functionExpression(null, clone.params, clone.body)
        : clone;
    const [funString, sourceMapString] = buildWorkletString(t, transformed.ast, variables, functionName, transformed.map);
    if (!funString)
        throw new Error("'funString' is not defined\n");
    const workletHash = hash(funString);
    let location = state.file.opts.filename;
    if (state.opts.relativeSourceLocation) {
        const path = require('path');
        location = path.relative(state.cwd, location);
    }
    let lineOffset = 1;
    if (closure.size > 0) {
        lineOffset -= closure.size + 2;
    }
    const pathForStringDefinitions = fun.parentPath.isProgram()
        ? fun
        : fun.findParent((path) => path.parentPath.isProgram());
    const initDataId = pathForStringDefinitions.parentPath.scope
        .generateUidIdentifier(`worklet_${workletHash}_init_data`);
    const initDataObjectExpression = t.objectExpression([
        t.objectProperty(t.identifier('code'), t.stringLiteral(funString)),
        t.objectProperty(t.identifier('location'), t.stringLiteral(location)),
    ]);
    if (sourceMapString) {
        initDataObjectExpression.properties.push(t.objectProperty(t.identifier('sourceMap'), t.stringLiteral(sourceMapString)));
    }
    pathForStringDefinitions.insertBefore(t.variableDeclaration('const', [
        t.variableDeclarator(initDataId, initDataObjectExpression),
    ]));
    if (BabelTypes.isFunctionDeclaration(funExpression) ||
        BabelTypes.isObjectMethod(funExpression))
        throw new Error("'funExpression' is either FunctionDeclaration or ObjectMethod and cannot be used in variableDeclaration\n");
    const statements = [
        t.variableDeclaration('const', [
            t.variableDeclarator(privateFunctionId, funExpression),
        ]),
        t.expressionStatement(t.assignmentExpression('=', t.memberExpression(privateFunctionId, t.identifier('_closure'), false), t.objectExpression(variables.map((variable) => t.objectProperty(t.identifier(variable.name), variable, false, true))))),
        t.expressionStatement(t.assignmentExpression('=', t.memberExpression(privateFunctionId, t.identifier('__initData'), false), initDataId)),
        t.expressionStatement(t.assignmentExpression('=', t.memberExpression(privateFunctionId, t.identifier('__workletHash'), false), t.numericLiteral(workletHash))),
    ];
    if (!isRelease()) {
        statements.unshift(t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier('_e'), t.arrayExpression([
                t.newExpression(t.memberExpression(t.identifier('global'), t.identifier('Error')), []),
                t.numericLiteral(lineOffset),
                t.numericLiteral(-27),
            ])),
        ]));
        statements.push(t.expressionStatement(t.assignmentExpression('=', t.memberExpression(privateFunctionId, t.identifier('__stackDetails'), false), t.identifier('_e'))));
    }
    statements.push(t.returnStatement(privateFunctionId));
    const newFun = t.functionExpression(undefined, [], t.blockStatement(statements));
    return newFun;
}
function processWorkletFunction(t, fun, state) {
    if (!t.isFunctionParent(fun)) {
        return;
    }
    const newFun = makeWorklet(t, fun, state);
    const replacement = t.callExpression(newFun, []);
    const needDeclaration = t.isScopable(fun.parent) || t.isExportNamedDeclaration(fun.parent);
    fun.replaceWith(!BabelTypes.isArrowFunctionExpression(fun.node) &&
        fun.node.id &&
        needDeclaration
        ? t.variableDeclaration('const', [
            t.variableDeclarator(fun.node.id, replacement),
        ])
        : replacement);
}
function processWorkletObjectMethod(t, path, state) {
    if (!BabelTypes.isFunctionParent(path))
        return;
    const newFun = makeWorklet(t, path, state);
    const replacement = BabelTypes.objectProperty(BabelTypes.identifier(BabelTypes.isIdentifier(path.node.key) ? path.node.key.name : ''), t.callExpression(newFun, []));
    path.replaceWith(replacement);
}
function processIfWorkletNode(t, fun, state) {
    fun.traverse({
        DirectiveLiteral(path) {
            const value = path.node.value;
            if (value === 'worklet' &&
                path.getFunctionParent() === fun &&
                BabelTypes.isBlockStatement(fun.node.body)) {
                const directives = fun.node.body.directives;
                if (directives &&
                    directives.length > 0 &&
                    directives.some((directive) => t.isDirectiveLiteral(directive.value) &&
                        directive.value.value === 'worklet')) {
                    processWorkletFunction(t, fun, state);
                }
            }
        },
    });
}
function processIfGestureHandlerEventCallbackFunctionNode(t, fun, state) {
    if (t.isCallExpression(fun.parent) &&
        t.isExpression(fun.parent.callee) &&
        isGestureObjectEventCallbackMethod(t, fun.parent.callee)) {
        processWorkletFunction(t, fun, state);
    }
}
function isGestureObjectEventCallbackMethod(t, node) {
    return (t.isMemberExpression(node) &&
        t.isIdentifier(node.property) &&
        gestureHandlerBuilderMethods.has(node.property.name) &&
        containsGestureObject(t, node.object));
}
function containsGestureObject(t, node) {
    if (isGestureObject(t, node)) {
        return true;
    }
    if (t.isCallExpression(node) &&
        t.isMemberExpression(node.callee) &&
        containsGestureObject(t, node.callee.object)) {
        return true;
    }
    return false;
}
function isGestureObject(t, node) {
    return (t.isCallExpression(node) &&
        t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.object) &&
        node.callee.object.name === 'Gesture' &&
        t.isIdentifier(node.callee.property) &&
        gestureHandlerGestureObjects.has(node.callee.property.name));
}
function processWorklets(t, path, state) {
    const callee = BabelTypes.isSequenceExpression(path.node.callee)
        ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
        : path.node.callee;
    let name = '';
    if ('name' in callee)
        name = callee.name;
    else if ('property' in callee && 'name' in callee.property)
        name = callee.property.name;
    if (objectHooks.has(name) &&
        BabelTypes.isObjectExpression(path.get('arguments.0').node)) {
        const properties = path.get('arguments.0.properties');
        for (const property of properties) {
            if (t.isObjectMethod(property.node)) {
                processWorkletObjectMethod(t, property, state);
            }
            else {
                const value = property.get('value');
                processWorkletFunction(t, value, state);
            }
        }
    }
    else {
        const indexes = functionArgsToWorkletize.get(name);
        if (Array.isArray(indexes)) {
            indexes.forEach((index) => {
                processWorkletFunction(t, path.get(`arguments.${index}`), state);
            });
        }
    }
}
function generateInlineStylesWarning(t, memberExpression) {
    return t.callExpression(t.arrowFunctionExpression([], t.blockStatement([
        t.expressionStatement(t.callExpression(t.memberExpression(t.identifier('console'), t.identifier('warn')), [
            t.callExpression(t.memberExpression(t.callExpression(t.identifier('require'), [
                t.stringLiteral('react-native-reanimated'),
            ]), t.identifier('getUseOfValueInStyleWarning')), []),
        ])),
        t.returnStatement(memberExpression.node),
    ])), []);
}
function processPropertyValueForInlineStylesWarning(t, path) {
    if (t.isMemberExpression(path.node) && t.isIdentifier(path.node.property)) {
        if (path.node.property.name === 'value') {
            path.replaceWith(generateInlineStylesWarning(t, path));
        }
    }
}
function processTransformPropertyForInlineStylesWarning(t, path) {
    if (t.isArrayExpression(path.node)) {
        const elements = path.get('elements');
        for (const element of elements) {
            if (t.isObjectExpression(element.node)) {
                processStyleObjectForInlineStylesWarning(t, element);
            }
        }
    }
}
function processStyleObjectForInlineStylesWarning(t, path) {
    const properties = path.get('properties');
    for (const property of properties) {
        if (!BabelTypes.isObjectProperty(property.node))
            continue;
        const value = property.get('value');
        if (t.isObjectProperty(property)) {
            if (t.isIdentifier(property.node.key) &&
                property.node.key.name === 'transform') {
                processTransformPropertyForInlineStylesWarning(t, value);
            }
            else {
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
    if (path.node.name.name !== 'style')
        return;
    if (!t.isJSXExpressionContainer(path.node.value))
        return;
    const expression = path
        .get('value')
        .get('expression');
    if (BabelTypes.isArrayExpression(expression.node)) {
        const elements = expression.get('elements');
        for (const element of elements) {
            if (t.isObjectExpression(element.node)) {
                processStyleObjectForInlineStylesWarning(t, element);
            }
        }
    }
    else if (t.isObjectExpression(expression.node)) {
        processStyleObjectForInlineStylesWarning(t, expression);
    }
}
function injectVersion(path, state) {
    const injectedName = '_REANIMATED_VERSION_BABEL_PLUGIN';
    if (state.opts.disablePluginVersionInjection || injectedName in globalThis) {
        return;
    }
    const versionString = package_json_1.default.version;
    const pluginVersion = BabelTypes.expressionStatement(BabelTypes.assignmentExpression('=', BabelTypes.memberExpression(BabelTypes.identifier('global'), BabelTypes.identifier(injectedName)), BabelTypes.stringLiteral(versionString)));
    path.node.body.unshift(pluginVersion);
    Object.defineProperty(globalThis, injectedName, {
        value: {
            flag: true,
        },
        enumerable: false,
        configurable: true,
        writable: true,
    });
}
module.exports = function ({ types: t, }) {
    return {
        pre() {
            if (this.opts != null && Array.isArray(this.opts.globals)) {
                this.opts.globals.forEach((name) => {
                    globals.add(name);
                });
            }
        },
        visitor: {
            Program: {
                enter(path, state) {
                    injectVersion(path, state);
                },
            },
            CallExpression: {
                enter(path, state) {
                    processWorklets(t, path, state);
                },
            },
            'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': {
                enter(path, state) {
                    processIfWorkletNode(t, path, state);
                    processIfGestureHandlerEventCallbackFunctionNode(t, path, state);
                },
            },
            JSXAttribute: {
                enter(path, state) {
                    processInlineStylesWarning(t, path, state);
                },
            },
        },
    };
};
//# sourceMappingURL=index.js.map