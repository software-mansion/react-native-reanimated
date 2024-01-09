const onFuncPrefixMatchingCreate = (context) => {
  return {
    // JSXElement:
    JSXOpeningElement: (node) => {
      if (node.name.type === 'JSXMemberExpression') {
        const expressionIdentifier = node.name.object.name;
        if (expressionIdentifier === 'Animated') {
          let containAnimatedProp = false;
          for (let attribute of node.attributes) {
            const attributeName = attribute.name.name;
            if (['entering', 'exiting', 'layout'].includes(attributeName)) {
              containAnimatedProp = true;
            }

            if (attributeName === 'style') {
              const valueExpression = attribute.value.expression;
              console.log('HERE', valueExpression.type);

              if (valueExpression.type === 'ObjectExpression') {
                const properties = valueExpression.properties;
                properties.forEach((property) => {});
                //inline Props
              }

              if (valueExpression.type === 'MemberExpression') {
                console.log(valueExpression);
                if (valueExpression.object === 'Identifier') {
                  // Assume that any style, that isn't accessed from stylesheet like styles.container
                  // is enough to assume that particular element has some animation
                  containAnimatedProp = true;
                }
              }
              if (valueExpression.type === 'ArrayExpression') {
                const elements = valueExpression.elements;
                elements.forEach((element) => {
                  if (element.type == 'Identifier') {
                    containAnimatedProp = true;
                  }
                });
              }
            }
          }
          if (!containAnimatedProp) {
            context.report(
              node,
              "This element is animated but doesn't have any actual animation"
            );
          }
        }
      }
    },
  };
};
module.exports = { onFuncPrefixMatchingCreate };
