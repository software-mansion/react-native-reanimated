function onFuncPrefixMatchingCreate(context) {
  return {
    JSXOpeningElement: (node) => {
      const componentName =
        node?.name?.type === 'JSXIdentifier' ? node.name?.name : 'Component';
      const sourceCode = context.getSourceCode();
      const tokensBefore = sourceCode.getTokensBefore(node);

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

      function checkIdentifierNode(styleExpression) {
        const variableName = styleExpression.name;

        const isAnimatedStyle = isVariableDefinedAs(
          variableName,
          'useAnimatedStyle',
          tokensBefore
        );

        if (isAnimatedStyle) {
          context.report(
            node,
            `Style "${variableName}" is an animated style, but was used in a default component. Replace your ${componentName} with an Animated.${componentName}`
          );
        }
      }

      function checkObjectNode(styleExpression) {
        const properties = styleExpression.properties;
        properties.forEach((property) => {
          if (property.value.type === 'Identifier') {
            if (isVariableDefinedAs(property.value.name, 'useSharedValue')) {
              context.report(
                node,
                `Property  "{${property.key.name} : ${property.value.name}}" is using a sharedValue "${property.value.name}", but was used in a default component. Replace your ${componentName} with an Animated.${componentName}`
              );
            }
          }
        });
      }

      function checkArrayNode(styleExpression) {
        const arrayNodes = styleExpression.elements;
        arrayNodes.forEach((node) => {
          if (node.type === 'Identifier') {
            checkIdentifierNode(node);
          } else if (node.type === 'ArrayExpression') {
            checkArrayNode(node);
          } else if (node.type === 'ObjectExpression') {
            checkObjectNode(node);
          }
        });
      }

      const styleAttribute = node.attributes.filter(
        (attribute) => attribute.name.name === 'style'
      );
      // assume no duplicate props allowed
      if (styleAttribute.length > 0) {
        const styleValue = styleAttribute[0].value;
        if (styleValue.type != 'JSXExpressionContainer') {
          return; //incorrect style was provided
        }
        const styleExpression = styleValue.expression;
        switch (styleExpression.type) {
          case 'Identifier': // style={myVariable}
            checkIdentifierNode(styleExpression);
            break;
          case 'ArrayExpression': // style={[style1, style2]}
            checkArrayNode(styleExpression);
            break;
          case 'ObjectExpression': //style={{backgroundColor:'pink'}}
            checkObjectNode(styleExpression);
            break;
          case 'MemberExpression':
          //style={{backgroundColor:styles.myStyle}}
          //We assume that all member expressions are correct
        }
      }
    },
  };
}

module.exports = {
  name: 'my-rule-name',
  meta: {
    description:
      'Require `.toString()` to only be called on objects which provide useful information when stringified',
    recommended: 'recommended',
    requiresTypeChecking: false,
  },
  create: onFuncPrefixMatchingCreate,
};
