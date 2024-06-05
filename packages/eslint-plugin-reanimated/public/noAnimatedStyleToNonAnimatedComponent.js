'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const utils_1 = require('@typescript-eslint/utils');
const rule = {
  create: function (context) {
    return {
      JSXOpeningElement(node) {
        var _a;
        if (node.name.type === utils_1.AST_NODE_TYPES.JSXMemberExpression) {
          return; // Property-like namespace syntax <Animated.View>
        }
        if (node.name.type === utils_1.AST_NODE_TYPES.JSXNamespacedName) {
          return; // XML-based namespace syntax: <Animated:View>
          // We include it although its not a supported syntax in React-Native
        }
        const sourceCode = context.getSourceCode();
        const tokensBefore = sourceCode.getTokensBefore(node);
        const componentName =
          (_a = node === null || node === void 0 ? void 0 : node.name) ===
            null || _a === void 0
            ? void 0
            : _a.name;
        main();
        function main() {
          if (
            isVariableDefinedAs(componentName, 'Animated') ||
            // People tend to import `Animated` as `Reanimated`.
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
          if (styleAttribute === undefined) {
            return;
          }
          const styleValue = styleAttribute.value; // assume no duplicate props
          if (
            styleValue === null ||
            styleValue.type === utils_1.AST_NODE_TYPES.Literal
          ) {
            return; //incorrect styles
          }
          if (styleValue.type === utils_1.AST_NODE_TYPES.JSXSpreadChild) {
            return; // Ignore this for now (and maybe forever, since its not a common use case)
          }
          const styleExpression = styleValue.expression;
          switch (styleExpression.type) {
            case utils_1.AST_NODE_TYPES.Identifier: // style={myVariable}
              checkIdentifierNodeForBeingAnimated(styleExpression);
              break;
            case utils_1.AST_NODE_TYPES.ArrayExpression: // style={[style1, style2]}
              checkArrayNodeForBeingAnimated(styleExpression);
              break;
            case utils_1.AST_NODE_TYPES.ObjectExpression: // style={{backgroundColor:'pink'}}
              checkObjectNodeForBeingAnimated(styleExpression);
              break;
            case utils_1.AST_NODE_TYPES.MemberExpression: // style={{backgroundColor:styles.myStyle}}
              // We assume that all member expressions are correct
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
              return; //Ignore spread elements
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
        function checkArrayNodeForBeingAnimated(styleExpression) {
          const arrayNodes = styleExpression.elements;
          arrayNodes.forEach((node) => {
            if (
              (node === null || node === void 0 ? void 0 : node.type) ===
              'Identifier'
            ) {
              checkIdentifierNodeForBeingAnimated(node);
            } else if (
              (node === null || node === void 0 ? void 0 : node.type) ===
              'ArrayExpression'
            ) {
              checkArrayNodeForBeingAnimated(node);
            } else if (
              (node === null || node === void 0 ? void 0 : node.type) ===
              'ObjectExpression'
            ) {
              checkObjectNodeForBeingAnimated(node);
            }
          });
        }
      },
    };
  },
  meta: {
    docs: {
      recommended: 'recommended',
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
exports.default = rule;
