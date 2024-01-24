"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("@typescript-eslint/utils");
var rule = {
    create: function (context) {
        return {
            JSXOpeningElement: function (node) {
                var _a;
                if (node.name.type === utils_1.AST_NODE_TYPES.JSXMemberExpression)
                    return; // Property-like namespace syntax <Animated.View>
                if (node.name.type === utils_1.AST_NODE_TYPES.JSXNamespacedName)
                    return; // XML-based namespace syntax: <Animated:View>
                var sourceCode = context.getSourceCode();
                var tokensBefore = sourceCode.getTokensBefore(node);
                var componentName = (_a = node === null || node === void 0 ? void 0 : node.name) === null || _a === void 0 ? void 0 : _a.name;
                function isVariableDefinedAs(variableName, expectedToken) {
                    var isAnimated = false;
                    var variableNameTokenIds = [];
                    tokensBefore.forEach(function (token, idx) {
                        if (token.value === variableName) {
                            variableNameTokenIds.push(idx);
                        }
                    });
                    variableNameTokenIds.forEach(function (idx) {
                        if (tokensBefore[idx + 2].value === expectedToken) {
                            isAnimated = true;
                        }
                    });
                    return isAnimated;
                }
                function checkIdentifierNode(styleExpression) {
                    var variableName = styleExpression.name;
                    var isAnimatedStyle = isVariableDefinedAs(variableName, 'useAnimatedStyle');
                    if (isAnimatedStyle) {
                        context.report({
                            node: node,
                            messageId: 'animatedStyle',
                            data: { componentName: componentName, variableName: variableName },
                        });
                    }
                }
                function checkObjectNode(styleExpression) {
                    var properties = styleExpression.properties;
                    properties.forEach(function (property) {
                        if (property.type === utils_1.AST_NODE_TYPES.SpreadElement) {
                            return; //Ignore spread elements
                        }
                        if (property.value.type === 'Identifier') {
                            var variableName = property.value.name;
                            if (isVariableDefinedAs(variableName, 'useSharedValue')) {
                                var propertyName = 'name' in property.key ? property.key.name : variableName;
                                context.report({
                                    node: node,
                                    messageId: 'sharedValue',
                                    data: { propertyName: propertyName, propertyValue: variableName },
                                });
                            }
                        }
                    });
                }
                function checkArrayNode(styleExpression) {
                    var arrayNodes = styleExpression.elements;
                    arrayNodes.forEach(function (node) {
                        if ((node === null || node === void 0 ? void 0 : node.type) === 'Identifier') {
                            checkIdentifierNode(node);
                        }
                        else if ((node === null || node === void 0 ? void 0 : node.type) === 'ArrayExpression') {
                            checkArrayNode(node);
                        }
                        else if ((node === null || node === void 0 ? void 0 : node.type) === 'ObjectExpression') {
                            checkObjectNode(node);
                        }
                    });
                }
                var styleAttribute = node.attributes
                    .map(function (attribute) {
                    return attribute.type === utils_1.AST_NODE_TYPES.JSXAttribute &&
                        attribute.name.name === 'style'
                        ? [attribute]
                        : [];
                })
                    .flat();
                if (styleAttribute.length == 0) {
                    return;
                }
                var styleValue = styleAttribute[0].value; // assume no duplicate props
                if (styleValue === null || styleValue.type === utils_1.AST_NODE_TYPES.Literal) {
                    return; //incorrect styles
                }
                if (styleValue.type === utils_1.AST_NODE_TYPES.JSXSpreadChild) {
                    return; //TODO Ignore this for now
                }
                var styleExpression = styleValue.expression;
                switch (styleExpression.type) {
                    case utils_1.AST_NODE_TYPES.Identifier: // style={myVariable}
                        checkIdentifierNode(styleExpression);
                        break;
                    case utils_1.AST_NODE_TYPES.ArrayExpression: // style={[style1, style2]}
                        checkArrayNode(styleExpression);
                        break;
                    case utils_1.AST_NODE_TYPES.ObjectExpression: //style={{backgroundColor:'pink'}}
                        checkObjectNode(styleExpression);
                        break;
                    case utils_1.AST_NODE_TYPES.MemberExpression:
                    //style={{backgroundColor:styles.myStyle}}
                    //We assume that all member expressions are correct
                }
            },
        };
    },
    meta: {
        docs: {
            recommended: 'error',
            description: 'Avoid looping over enums.',
        },
        messages: {
            sharedValue: "Property  '{{propertyName} : {{propertyValue}}' is using a sharedValue '{{propertyValue}}', but was used in a default component. Replace your {{componentName}} with an Animated.{{componentName}}",
            animatedStyle: "Style '{{variableName}}' is an animated style, but was used in a default component. Replace your '{{componentName}}' with an Animated.{{componentName}}",
        },
        type: 'suggestion',
        schema: [],
    },
    defaultOptions: [],
};
exports.default = rule;
