function isVariableAnAnimatedStyle(variableName, tokensBefore) {
  let isAnimated = false;

  const variableNameTokenIds = [];
  tokensBefore.forEach((token, idx) => {
    if (token.value === variableName) {
      variableNameTokenIds.push(idx);
    }
  });
  variableNameTokenIds.forEach((idx) => {
    if (tokensBefore[idx + 2].value === 'useAnimatedStyle') {
      isAnimated = true;
    }
  });

  return isAnimated;
}

function onFuncPrefixMatchingCreate(context) {
  return {
    JSXOpeningElement: (node) => {
      const componentName =
        node?.name?.type === 'JSXIdentifier' ? node.name?.name : 'Component';
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
            const variableName = styleExpression.name;
            const sourceCode = context.getSourceCode();
            const tokensBefore = sourceCode.getTokensBefore(node);

            const isAnimatedStyle = isVariableAnAnimatedStyle(
              variableName,
              tokensBefore
            );

            if (isAnimatedStyle) {
              context.report(
                node,
                `Style "${variableName}" is an animated style, but was used in a default component. Replace your ${componentName} with an Animated.${componentName}`
              );
            }

            break;
          case 'ArrayExpression': // style={[style1, style2]}
            context.report(node, `Found ${componentName}, ArrayExpression`);
          case 'ObjectExpression': //style={{backgroundColor:'pink'}}
            context.report(node, `Found ${componentName}, ObjectExpression`);
          case 'MemberExpression':
            //style={{backgroundColor:styles.myStyle}}
            context.report(
              node,
              `We assume that all member expressions are correct`
            );
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
