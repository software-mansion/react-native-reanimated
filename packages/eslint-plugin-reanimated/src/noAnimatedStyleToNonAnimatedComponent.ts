import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const rule: TSESLint.RuleModule<'animatedStyle' | 'sharedValue'> = {
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type === AST_NODE_TYPES.JSXMemberExpression) {
          return; // Property-like namespace syntax <Animated.View>
        }
        if (node.name.type === AST_NODE_TYPES.JSXNamespacedName) {
          return; // XML-based namespace syntax: <Animated:View>
          // We include it although its not a supported syntax in React-Native
        }
        const sourceCode = context.getSourceCode();
        const tokensBefore = sourceCode.getTokensBefore(node);
        const componentName = node?.name?.name;

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
              attribute.type === AST_NODE_TYPES.JSXAttribute &&
              attribute.name.name === 'style'
            );
          }) as TSESTree.JSXAttribute | undefined;

          if (styleAttribute === undefined) {
            return;
          }

          const styleValue = styleAttribute.value; // assume no duplicate props
          if (
            styleValue === null ||
            styleValue.type === AST_NODE_TYPES.Literal
          ) {
            return; // incorrect styles
          }

          if (styleValue.type === AST_NODE_TYPES.JSXSpreadChild) {
            return; // Ignore this for now (and maybe forever, since its not a common use case)
          }

          // @ts-expect-error TODO: FIX ME
          const styleExpression = styleValue.expression as
            | TSESTree.Identifier
            | TSESTree.ArrayExpression
            | TSESTree.ObjectExpression
            | TSESTree.MemberExpression;
          switch (styleExpression.type) {
            case AST_NODE_TYPES.Identifier: // style={myVariable}
              checkIdentifierNodeForBeingAnimated(styleExpression);
              break;
            case AST_NODE_TYPES.ArrayExpression: // style={[style1, style2]}
              checkArrayNodeForBeingAnimated(styleExpression);
              break;
            case AST_NODE_TYPES.ObjectExpression: // style={{backgroundColor:'pink'}}
              checkObjectNodeForBeingAnimated(styleExpression);
              break;
            case AST_NODE_TYPES.MemberExpression: // style={{backgroundColor:styles.myStyle}}
              // We assume that all member expressions are correct
              break;
          }
        }

        function isVariableDefinedAs(
          variableName: string,
          expectedToken: string
        ) {
          const variableNameTokenIds: Array<number> = [];

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

        function checkIdentifierNodeForBeingAnimated(
          styleExpression: TSESTree.Identifier
        ) {
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

        function checkObjectNodeForBeingAnimated(
          styleExpression: TSESTree.ObjectExpression
        ) {
          const properties = styleExpression.properties;
          properties.forEach((property) => {
            if (property.type === AST_NODE_TYPES.SpreadElement) {
              return; // Ignore spread elements
            }

            if (property.value.type === AST_NODE_TYPES.Identifier) {
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

        function checkArrayNodeForBeingAnimated(
          styleExpression: TSESTree.ArrayExpression
        ) {
          const arrayNodes = styleExpression.elements;
          arrayNodes.forEach((arrayNode) => {
            if (arrayNode?.type === AST_NODE_TYPES.Identifier) {
              checkIdentifierNodeForBeingAnimated(arrayNode);
            } else if (arrayNode?.type === AST_NODE_TYPES.ArrayExpression) {
              checkArrayNodeForBeingAnimated(arrayNode);
            } else if (arrayNode?.type === AST_NODE_TYPES.ObjectExpression) {
              checkObjectNodeForBeingAnimated(arrayNode);
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

export default rule;
