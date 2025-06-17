'use strict';
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) =>
  function __require() {
    return (
      mod ||
        (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod),
      mod.exports
    );
  };

// public/noAnimatedStyleToNonAnimatedComponent.js
var require_noAnimatedStyleToNonAnimatedComponent = __commonJS({
  'public/noAnimatedStyleToNonAnimatedComponent.js'(exports2) {
    'use strict';
    Object.defineProperty(exports2, '__esModule', { value: true });
    var utils_1 = require('@typescript-eslint/utils');
    var rule = {
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (node.name.type === utils_1.AST_NODE_TYPES.JSXMemberExpression) {
              return;
            }
            if (node.name.type === utils_1.AST_NODE_TYPES.JSXNamespacedName) {
              return;
            }
            const sourceCode = context.getSourceCode();
            const tokensBefore = sourceCode.getTokensBefore(node);
            const componentName = node?.name?.name;
            main();
            function main() {
              if (
                isVariableDefinedAs(componentName, 'Animated') || // People tend to import `Animated` as `Reanimated`.
                // TODO parse imports to detect actual import name
                isVariableDefinedAs(componentName, 'Reanimated') ||
                isVariableDefinedAs(componentName, 'createAnimatedComponent')
              ) {
                return;
              }
              const styleAttribute = node.attributes.find((attribute) => {
                return (
                  attribute.type === utils_1.AST_NODE_TYPES.JSXAttribute &&
                  attribute.name.name === 'style'
                );
              });
              if (styleAttribute === void 0) {
                return;
              }
              const styleValue = styleAttribute.value;
              if (
                styleValue === null ||
                styleValue.type === utils_1.AST_NODE_TYPES.Literal
              ) {
                return;
              }
              if (styleValue.type === utils_1.AST_NODE_TYPES.JSXSpreadChild) {
                return;
              }
              const styleExpression = styleValue.expression;
              switch (styleExpression.type) {
                case utils_1.AST_NODE_TYPES.Identifier:
                  checkIdentifierNodeForBeingAnimated(styleExpression);
                  break;
                case utils_1.AST_NODE_TYPES.ArrayExpression:
                  checkArrayNodeForBeingAnimated(styleExpression);
                  break;
                case utils_1.AST_NODE_TYPES.ObjectExpression:
                  checkObjectNodeForBeingAnimated(styleExpression);
                  break;
                case utils_1.AST_NODE_TYPES.MemberExpression:
                  break;
              }
            }
            function isVariableDefinedAs(variableName, expectedToken) {
              const variableNameTokenIds = [];
              tokensBefore.forEach((token, idx) => {
                if (token.value === variableName) {
                  variableNameTokenIds.push(idx);
                }
              });
              return variableNameTokenIds.some(
                (idx) =>
                  /*
                 Lets count tokens from variable name to its definition, e.g.:
                 ╭───────────┬───────┬───────┬───────┬────────────────╮
                 │ Code      │ const │  sv   │   =   │ useSharedValue │
                 ├───────────┼───────┼───────┼───────┼────────────────┤
                 │ Token     │ idx-1 │ idx   │ idx+1 │      idx+2     │
                 ╰───────────┴───────┴───────┴───────┴────────────────╯
                */
                  tokensBefore[idx + 2].value === expectedToken
              );
            }
            function checkIdentifierNodeForBeingAnimated(styleExpression) {
              const variableName = styleExpression.name;
              const isAnimatedStyle = isVariableDefinedAs(
                variableName,
                'useAnimatedStyle'
              );
              if (isAnimatedStyle) {
                context.report({
                  node,
                  messageId: 'animatedStyle',
                  data: { componentName, variableName },
                });
              }
            }
            function checkObjectNodeForBeingAnimated(styleExpression) {
              const properties = styleExpression.properties;
              properties.forEach((property) => {
                if (property.type === utils_1.AST_NODE_TYPES.SpreadElement) {
                  return;
                }
                if (property.value.type === utils_1.AST_NODE_TYPES.Identifier) {
                  const variableName = property.value.name;
                  if (isVariableDefinedAs(variableName, 'useSharedValue')) {
                    const propertyName =
                      'name' in property.key ? property.key.name : variableName;
                    context.report({
                      node,
                      messageId: 'sharedValue',
                      data: {
                        propertyName,
                        propertyValue: variableName,
                        componentName,
                      },
                    });
                  }
                }
              });
            }
            function checkArrayNodeForBeingAnimated(styleExpression) {
              const arrayNodes = styleExpression.elements;
              arrayNodes.forEach((arrayNode) => {
                if (arrayNode?.type === utils_1.AST_NODE_TYPES.Identifier) {
                  checkIdentifierNodeForBeingAnimated(arrayNode);
                } else if (
                  arrayNode?.type === utils_1.AST_NODE_TYPES.ArrayExpression
                ) {
                  checkArrayNodeForBeingAnimated(arrayNode);
                } else if (
                  arrayNode?.type === utils_1.AST_NODE_TYPES.ObjectExpression
                ) {
                  checkObjectNodeForBeingAnimated(arrayNode);
                }
              });
            }
          },
        };
      },
      meta: {
        docs: {
          // recommended: 'recommended',
          description:
            "Don't pass a reanimated animated style into a non-animated component.",
        },
        messages: {
          sharedValue:
            "Property  '{{propertyName}}: {{propertyValue}}' is using a shared value '{{propertyValue}}', but was used in a default component. Replace {{componentName}} with an animated component from Reanimated.",
          animatedStyle:
            "Style '{{variableName}}' is an animated style, but was used in a default component. Replace your '{{componentName}}' with an animated component from Reanimated.",
        },
        type: 'suggestion',
        schema: [],
      },
      defaultOptions: [],
    };
    exports2.default = rule;
  },
});

// public/useGlobalThis.js
var require_useGlobalThis = __commonJS({
  'public/useGlobalThis.js'(exports2) {
    'use strict';
    Object.defineProperty(exports2, '__esModule', { value: true });
    var utils_1 = require('@typescript-eslint/utils');
    var rule = {
      create(context) {
        return {
          Identifier(node) {
            if (
              node.name === '_WORKLET' &&
              node.parent?.type !== utils_1.AST_NODE_TYPES.MemberExpression
            ) {
              context.report({
                node,
                messageId: 'useGlobalThis',
                fix(fixer) {
                  return fixer.replaceText(node, 'globalThis._WORKLET');
                },
              });
            }
          },
        };
      },
      meta: {
        docs: {
          // recommended: 'recommended',
          description:
            'Warns when `_WORKLET` is used instead of `globalThis._WORKLET`.',
        },
        messages: {
          useGlobalThis: 'Use `globalThis._WORKLET` instead of `_WORKLET`.',
        },
        type: 'suggestion',
        schema: [],
        fixable: 'code',
      },
      defaultOptions: [],
    };
    exports2.default = rule;
  },
});

// public/useReanimatedError.js
var require_useReanimatedError = __commonJS({
  'public/useReanimatedError.js'(exports2) {
    'use strict';
    Object.defineProperty(exports2, '__esModule', { value: true });
    var utils_1 = require('@typescript-eslint/utils');
    var rule = {
      create(context) {
        return {
          NewExpression(node) {
            if (
              node.callee.type === utils_1.AST_NODE_TYPES.Identifier &&
              node.callee.name === 'Error'
            ) {
              context.report({
                node,
                messageId: 'useReanimatedError',
                fix(fixer) {
                  return fixer.replaceText(node.callee, 'ReanimatedError');
                },
              });
            }
          },
        };
      },
      meta: {
        docs: {
          // recommended: 'recommended',
          description:
            'Warns when `new Error` is used instead of `new ReanimatedError`.',
        },
        messages: {
          useReanimatedError:
            'Use `new ReanimatedError` instead of `new Error`.',
        },
        type: 'suggestion',
        schema: [],
        fixable: 'code',
      },
      defaultOptions: [],
    };
    exports2.default = rule;
  },
});

// public/useWorkletsError.js
var require_useWorkletsError = __commonJS({
  'public/useWorkletsError.js'(exports2) {
    'use strict';
    Object.defineProperty(exports2, '__esModule', { value: true });
    var utils_1 = require('@typescript-eslint/utils');
    var rule = {
      create(context) {
        return {
          NewExpression(node) {
            if (
              node.callee.type === utils_1.AST_NODE_TYPES.Identifier &&
              node.callee.name === 'Error'
            ) {
              context.report({
                node,
                messageId: 'useWorkletsError',
                fix(fixer) {
                  return fixer.replaceText(node.callee, 'WorkletsError');
                },
              });
            }
          },
        };
      },
      meta: {
        docs: {
          // recommended: 'recommended',
          description:
            'Warns when `new Error` is used instead of `new WorkletsError`.',
        },
        messages: {
          useWorkletsError: 'Use `new WorkletsError` instead of `new Error`.',
        },
        type: 'suggestion',
        schema: [],
        fixable: 'code',
      },
      defaultOptions: [],
    };
    exports2.default = rule;
  },
});

// public/index.js
var __importDefault =
  (exports && exports.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.rules = void 0;
var noAnimatedStyleToNonAnimatedComponent_1 = __importDefault(
  require_noAnimatedStyleToNonAnimatedComponent()
);
var useGlobalThis_1 = __importDefault(require_useGlobalThis());
var useReanimatedError_1 = __importDefault(require_useReanimatedError());
var useWorkletsError_1 = __importDefault(require_useWorkletsError());
exports.rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent_1.default,
  'use-reanimated-error': useReanimatedError_1.default,
  'use-worklets-error': useWorkletsError_1.default,
  'use-global-this': useGlobalThis_1.default,
};
