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
      create: function (context) {
        return {
          JSXOpeningElement(node) {
            if (node.name.type === utils_1.AST_NODE_TYPES.JSXMemberExpression)
              return;
            if (node.name.type === utils_1.AST_NODE_TYPES.JSXNamespacedName)
              return;
            const sourceCode = context.getSourceCode();
            const tokensBefore = sourceCode.getTokensBefore(node);
            const componentName = node?.name?.name;
            function isVariableDefinedAs(variableName, expectedToken) {
              let isAnimated = false;
              const variableNameTokenIds = [];
              tokensBefore.forEach((token, idx) => {
                if (token.value === variableName) {
                  variableNameTokenIds.push(idx);
                }
              });
              variableNameTokenIds.forEach((idx) => {
                if (tokensBefore[idx + 2].value === expectedToken) {
                  isAnimated = true;
                }
              });
              return isAnimated;
            }
            function checkIdentifierNode(styleExpression2) {
              const variableName = styleExpression2.name;
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
            function checkObjectNode(styleExpression2) {
              const properties = styleExpression2.properties;
              properties.forEach((property) => {
                if (property.type === utils_1.AST_NODE_TYPES.SpreadElement) {
                  return;
                }
                if (property.value.type === 'Identifier') {
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
            function checkArrayNode(styleExpression2) {
              const arrayNodes = styleExpression2.elements;
              arrayNodes.forEach((node2) => {
                if (node2?.type === 'Identifier') {
                  checkIdentifierNode(node2);
                } else if (node2?.type === 'ArrayExpression') {
                  checkArrayNode(node2);
                } else if (node2?.type === 'ObjectExpression') {
                  checkObjectNode(node2);
                }
              });
            }
            if (
              isVariableDefinedAs(componentName, 'Animated') ||
              isVariableDefinedAs(componentName, 'createAnimatedComponent')
            ) {
              return;
            }
            const styleAttribute = node.attributes
              .map((attribute) => {
                return attribute.type === utils_1.AST_NODE_TYPES.JSXAttribute &&
                  attribute.name.name === 'style'
                  ? [attribute]
                  : [];
              })
              .flat();
            if (styleAttribute.length == 0) {
              return;
            }
            const styleValue = styleAttribute[0].value;
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
                checkIdentifierNode(styleExpression);
                break;
              case utils_1.AST_NODE_TYPES.ArrayExpression:
                checkArrayNode(styleExpression);
                break;
              case utils_1.AST_NODE_TYPES.ObjectExpression:
                checkObjectNode(styleExpression);
                break;
              case utils_1.AST_NODE_TYPES.MemberExpression:
            }
          },
        };
      },
      meta: {
        docs: {
          recommended: 'recommended',
          description: 'Avoid looping over enums.',
        },
        messages: {
          sharedValue:
            "Property  '{{propertyName}}: {{propertyValue}}' is using a sharedValue '{{propertyValue}}', but was used in a default component. Replace your {{componentName}} with an Animated.{{componentName}}",
          animatedStyle:
            "Style '{{variableName}}' is an animated style, but was used in a default component. Replace your '{{componentName}}' with an Animated.{{componentName}}",
        },
        type: 'suggestion',
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
exports.rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent_1.default,
};
