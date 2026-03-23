'use strict';
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === 'object') || typeof from === 'function') {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, '__esModule', { value: true }), mod);

// public/index.js
var index_exports = {};
__export(index_exports, {
  rules: () => rules,
});
module.exports = __toCommonJS(index_exports);

// public/noAnimatedStyleToNonAnimatedComponent.js
var import_utils = require('@typescript-eslint/utils');
var rule = {
  create: function (context) {
    return {
      JSXOpeningElement: function (node) {
        var _a;
        if (
          node.name.type === import_utils.AST_NODE_TYPES.JSXMemberExpression
        ) {
          return;
        }
        if (node.name.type === import_utils.AST_NODE_TYPES.JSXNamespacedName) {
          return;
        }
        var sourceCode = context.getSourceCode();
        var tokensBefore = sourceCode.getTokensBefore(node);
        var componentName =
          (_a = node === null || node === void 0 ? void 0 : node.name) ===
            null || _a === void 0
            ? void 0
            : _a.name;
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
          var styleAttribute = node.attributes.find(function (attribute) {
            return (
              attribute.type === import_utils.AST_NODE_TYPES.JSXAttribute &&
              attribute.name.name === 'style'
            );
          });
          if (styleAttribute === void 0) {
            return;
          }
          var styleValue = styleAttribute.value;
          if (
            styleValue === null ||
            styleValue.type === import_utils.AST_NODE_TYPES.Literal
          ) {
            return;
          }
          if (styleValue.type === import_utils.AST_NODE_TYPES.JSXSpreadChild) {
            return;
          }
          var styleExpression = styleValue.expression;
          switch (styleExpression.type) {
            case import_utils.AST_NODE_TYPES.Identifier:
              checkIdentifierNodeForBeingAnimated(styleExpression);
              break;
            case import_utils.AST_NODE_TYPES.ArrayExpression:
              checkArrayNodeForBeingAnimated(styleExpression);
              break;
            case import_utils.AST_NODE_TYPES.ObjectExpression:
              checkObjectNodeForBeingAnimated(styleExpression);
              break;
            case import_utils.AST_NODE_TYPES.MemberExpression:
              break;
          }
        }
        function isVariableDefinedAs(variableName, expectedToken) {
          var variableNameTokenIds = [];
          tokensBefore.forEach(function (token, idx) {
            if (token.value === variableName) {
              variableNameTokenIds.push(idx);
            }
          });
          return variableNameTokenIds.some(function (idx) {
            return tokensBefore[idx + 2].value === expectedToken;
          });
        }
        function checkIdentifierNodeForBeingAnimated(styleExpression) {
          var variableName = styleExpression.name;
          var isAnimatedStyle = isVariableDefinedAs(
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
          var properties = styleExpression.properties;
          properties.forEach(function (property) {
            if (property.type === import_utils.AST_NODE_TYPES.SpreadElement) {
              return;
            }
            if (
              property.value.type === import_utils.AST_NODE_TYPES.Identifier
            ) {
              var variableName = property.value.name;
              if (isVariableDefinedAs(variableName, 'useSharedValue')) {
                var propertyName =
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
          var arrayNodes = styleExpression.elements;
          arrayNodes.forEach(function (arrayNode) {
            if (
              (arrayNode === null || arrayNode === void 0
                ? void 0
                : arrayNode.type) === import_utils.AST_NODE_TYPES.Identifier
            ) {
              checkIdentifierNodeForBeingAnimated(arrayNode);
            } else if (
              (arrayNode === null || arrayNode === void 0
                ? void 0
                : arrayNode.type) ===
              import_utils.AST_NODE_TYPES.ArrayExpression
            ) {
              checkArrayNodeForBeingAnimated(arrayNode);
            } else if (
              (arrayNode === null || arrayNode === void 0
                ? void 0
                : arrayNode.type) ===
              import_utils.AST_NODE_TYPES.ObjectExpression
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
var noAnimatedStyleToNonAnimatedComponent_default = rule;

// public/noLoggerMessagePrefix.js
var import_utils2 = require('@typescript-eslint/utils');
var PREFIX_REGEX = /^\s*(\[(?:Reanimated|Worklets)\])\s*/;
var rule2 = {
  create: function (context) {
    return {
      CallExpression: function (node) {
        var _a;
        var callee = node.callee,
          args = node.arguments;
        if (
          callee.type === import_utils2.AST_NODE_TYPES.MemberExpression &&
          !callee.computed &&
          callee.object.type === import_utils2.AST_NODE_TYPES.Identifier &&
          callee.object.name === 'logger' &&
          callee.property.type === import_utils2.AST_NODE_TYPES.Identifier &&
          (callee.property.name === 'warn' ||
            callee.property.name === 'error') &&
          args.length > 0
        ) {
          var first_1 = args[0];
          if (
            first_1.type === import_utils2.AST_NODE_TYPES.Literal &&
            typeof first_1.value === 'string'
          ) {
            var match = first_1.value.match(PREFIX_REGEX);
            if (!match) {
              return;
            }
            context.report({
              node: first_1,
              messageId: 'noLoggerMessagePrefix',
              data: { prefix: match[1] },
              fix: function (fixer) {
                var without = first_1.value.replace(PREFIX_REGEX, '');
                return fixer.replaceText(first_1, JSON.stringify(without));
              },
            });
          } else if (
            first_1.type === import_utils2.AST_NODE_TYPES.TemplateLiteral
          ) {
            var firstQuasi_1 = first_1.quasis[0];
            var cooked =
              (_a = firstQuasi_1.value.cooked) !== null && _a !== void 0
                ? _a
                : '';
            var match_1 = cooked.match(PREFIX_REGEX);
            if (!match_1) {
              return;
            }
            context.report({
              node: first_1,
              messageId: 'noLoggerMessagePrefix',
              data: { prefix: match_1[1] },
              fix: function (fixer) {
                var prefixLen = match_1[0].length;
                var removeStart = firstQuasi_1.range[0] + 1;
                var removeEnd = removeStart + prefixLen;
                return fixer.removeRange([removeStart, removeEnd]);
              },
            });
          }
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        'Disallow redundant prefix that the logger adds automatically.',
    },
    messages: {
      noLoggerMessagePrefix:
        'Remove the redundant "{{prefix}}" prefix; it is added automatically.',
    },
    type: 'problem',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};
var noLoggerMessagePrefix_default = rule2;

// public/useGlobalThis.js
var import_utils3 = require('@typescript-eslint/utils');
var rule3 = {
  create: function (context) {
    return {
      Identifier: function (node) {
        var _a;
        if (
          node.name === '_WORKLET' &&
          ((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) !==
            import_utils3.AST_NODE_TYPES.MemberExpression
        ) {
          context.report({
            node,
            messageId: 'useGlobalThis',
            fix: function (fixer) {
              return fixer.replaceText(node, 'globalThis._WORKLET');
            },
          });
        }
      },
    };
  },
  meta: {
    docs: {
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
var useGlobalThis_default = rule3;

// public/useLogger.js
var import_utils4 = require('@typescript-eslint/utils');
var rule4 = {
  create: function (context) {
    return {
      CallExpression: function (node) {
        var callee = node.callee;
        if (
          callee.type === import_utils4.AST_NODE_TYPES.MemberExpression &&
          !callee.computed &&
          callee.object.type === import_utils4.AST_NODE_TYPES.Identifier &&
          callee.object.name === 'console' &&
          callee.property.type === import_utils4.AST_NODE_TYPES.Identifier &&
          (callee.property.name === 'warn' || callee.property.name === 'error')
        ) {
          var method = callee.property.name;
          context.report({
            node: callee,
            messageId: 'useLogger',
            data: { method },
            fix: function (fixer) {
              return fixer.replaceText(callee.object, 'logger');
            },
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        'Require the use of logger instead of console for warnings and errors.',
    },
    messages: {
      useLogger: 'Use logger.{{ method }}() instead of console.{{ method }}().',
    },
    type: 'problem',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};
var useLogger_default = rule4;

// public/useReanimatedError.js
var import_utils5 = require('@typescript-eslint/utils');
var rule5 = {
  create: function (context) {
    return {
      NewExpression: function (node) {
        if (
          node.callee.type === import_utils5.AST_NODE_TYPES.Identifier &&
          node.callee.name === 'Error'
        ) {
          context.report({
            node,
            messageId: 'useReanimatedError',
            fix: function (fixer) {
              return fixer.replaceText(node.callee, 'ReanimatedError');
            },
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        'Warns when `new Error` is used instead of `new ReanimatedError`.',
    },
    messages: {
      useReanimatedError: 'Use `new ReanimatedError` instead of `new Error`.',
    },
    type: 'suggestion',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};
var useReanimatedError_default = rule5;

// public/useWorkletsError.js
var import_utils6 = require('@typescript-eslint/utils');
var rule6 = {
  create: function (context) {
    return {
      NewExpression: function (node) {
        if (
          node.callee.type === import_utils6.AST_NODE_TYPES.Identifier &&
          node.callee.name === 'Error'
        ) {
          context.report({
            node,
            messageId: 'useWorkletsError',
            fix: function (fixer) {
              return fixer.replaceText(node.callee, 'WorkletsError');
            },
          });
        }
      },
    };
  },
  meta: {
    docs: {
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
var useWorkletsError_default = rule6;

// public/index.js
var rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent_default,
  'use-logger': useLogger_default,
  'no-logger-message-prefix': noLoggerMessagePrefix_default,
  'use-reanimated-error': useReanimatedError_default,
  'use-worklets-error': useWorkletsError_default,
  'use-global-this': useGlobalThis_default,
};
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    rules,
  });
