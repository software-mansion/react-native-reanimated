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

// public/noLoggerMessagePrefix.js
var require_noLoggerMessagePrefix = __commonJS({
  'public/noLoggerMessagePrefix.js'(exports2) {
    'use strict';
    Object.defineProperty(exports2, '__esModule', { value: true });
    var utils_1 = require('@typescript-eslint/utils');
    var PREFIX_REGEX = /^\s*(\[(?:Reanimated|Worklets)\])\s*/;
    var rule = {
      create(context) {
        return {
          CallExpression(node) {
            const { callee, arguments: args } = node;
            if (
              callee.type === utils_1.AST_NODE_TYPES.MemberExpression &&
              !callee.computed &&
              callee.object.type === utils_1.AST_NODE_TYPES.Identifier &&
              callee.object.name === 'logger' &&
              callee.property.type === utils_1.AST_NODE_TYPES.Identifier &&
              (callee.property.name === 'warn' ||
                callee.property.name === 'error') &&
              args.length > 0
            ) {
              const first = args[0];
              if (
                first.type === utils_1.AST_NODE_TYPES.Literal &&
                typeof first.value === 'string'
              ) {
                const match = first.value.match(PREFIX_REGEX);
                if (!match) {
                  return;
                }
                context.report({
                  node: first,
                  messageId: 'noLoggerMessagePrefix',
                  data: { prefix: match[1] },
                  fix(fixer) {
                    const without = first.value.replace(PREFIX_REGEX, '');
                    return fixer.replaceText(first, JSON.stringify(without));
                  },
                });
              } else if (
                first.type === utils_1.AST_NODE_TYPES.TemplateLiteral
              ) {
                const firstQuasi = first.quasis[0];
                const cooked = firstQuasi.value.cooked ?? '';
                const match = cooked.match(PREFIX_REGEX);
                if (!match) {
                  return;
                }
                context.report({
                  node: first,
                  messageId: 'noLoggerMessagePrefix',
                  data: { prefix: match[1] },
                  fix(fixer) {
                    const prefixLen = match[0].length;
                    const removeStart = firstQuasi.range[0] + 1;
                    const removeEnd = removeStart + prefixLen;
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

// public/useLogger.js
var require_useLogger = __commonJS({
  'public/useLogger.js'(exports2) {
    'use strict';
    Object.defineProperty(exports2, '__esModule', { value: true });
    var utils_1 = require('@typescript-eslint/utils');
    var rule = {
      create(context) {
        return {
          CallExpression(node) {
            const { callee } = node;
            if (
              callee.type === utils_1.AST_NODE_TYPES.MemberExpression &&
              !callee.computed &&
              callee.object.type === utils_1.AST_NODE_TYPES.Identifier &&
              callee.object.name === 'console' &&
              callee.property.type === utils_1.AST_NODE_TYPES.Identifier &&
              (callee.property.name === 'warn' ||
                callee.property.name === 'error')
            ) {
              const method = callee.property.name;
              context.report({
                node: callee,
                messageId: 'useLogger',
                data: { method },
                fix(fixer) {
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
          useLogger:
            'Use logger.{{ method }}() instead of console.{{ method }}().',
        },
        type: 'problem',
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

// public/wrongLoggerImport.js
var require_wrongLoggerImport = __commonJS({
  'public/wrongLoggerImport.js'(exports2) {
    'use strict';
    Object.defineProperty(exports2, '__esModule', { value: true });
    var utils_1 = require('@typescript-eslint/utils');
    var PACKAGES = ['react-native-reanimated', 'react-native-worklets'];
    var detectPackage = (filePath) =>
      PACKAGES.find(
        (pkg) => filePath.includes(`${pkg}/`) || filePath.includes(`${pkg}\\`)
      );
    var findLoggerImport = (body) =>
      body.find(
        (n) =>
          n.type === utils_1.AST_NODE_TYPES.ImportDeclaration &&
          n.specifiers.some((s) => s.local.name === 'logger')
      );
    var rule = {
      create(context) {
        return {
          'Program:exit'(program) {
            const pkg = detectPackage(context.filename);
            if (!pkg) {
              return;
            }
            const imp = findLoggerImport(program.body);
            if (!imp || imp.source.type !== utils_1.AST_NODE_TYPES.Literal) {
              return;
            }
            const foreignPkg = PACKAGES.find(
              (p) => p !== pkg && String(imp.source.value).includes(p)
            );
            if (!foreignPkg) {
              return;
            }
            const loggerSpecifier = imp.specifiers.find(
              (s) => s.local.name === 'logger'
            );
            context.report({
              node: loggerSpecifier?.local ?? imp.source,
              messageId: 'wrongLoggerImport',
              data: { foreignPkg },
            });
          },
        };
      },
      meta: {
        docs: {
          recommended: 'recommended',
          description: 'Require the use of logger from the local package.',
        },
        messages: {
          wrongLoggerImport:
            'Logger must be imported from the local package; current import points to "{{ foreignPkg }}".',
        },
        type: 'problem',
        schema: [],
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
var noLoggerMessagePrefix_1 = __importDefault(require_noLoggerMessagePrefix());
var useGlobalThis_1 = __importDefault(require_useGlobalThis());
var useLogger_1 = __importDefault(require_useLogger());
var useReanimatedError_1 = __importDefault(require_useReanimatedError());
var useWorkletsError_1 = __importDefault(require_useWorkletsError());
var wrongLoggerImport_1 = __importDefault(require_wrongLoggerImport());
exports.rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent_1.default,
  'use-logger': useLogger_1.default,
  'wrong-logger-import': wrongLoggerImport_1.default,
  'no-logger-message-prefix': noLoggerMessagePrefix_1.default,
  'use-reanimated-error': useReanimatedError_1.default,
  'use-worklets-error': useWorkletsError_1.default,
  'use-global-this': useGlobalThis_1.default,
};
