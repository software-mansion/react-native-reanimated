import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const rule: TSESLint.RuleModule<'sharedValueInInlineStyle'> = {
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.type !== AST_NODE_TYPES.JSXIdentifier ||
          node.name.name !== 'style' ||
          node.value?.type !== AST_NODE_TYPES.JSXExpressionContainer
        ) {
          return;
        }
        const expression = node.value.expression;
        if (expression.type === AST_NODE_TYPES.ArrayExpression) {
          checkStyleObjects(expression);
        } else if (expression.type === AST_NODE_TYPES.ObjectExpression) {
          checkStyleObject(expression);
        }
      },
    };

    function checkStyleObjects(array: TSESTree.ArrayExpression) {
      for (const element of array.elements) {
        if (element?.type === AST_NODE_TYPES.ObjectExpression) {
          checkStyleObject(element);
        }
      }
    }

    function checkStyleObject(object: TSESTree.ObjectExpression) {
      for (const property of object.properties) {
        if (property.type !== AST_NODE_TYPES.Property) {
          continue;
        }
        if (
          property.key.type === AST_NODE_TYPES.Identifier &&
          property.key.name === 'transform'
        ) {
          if (property.value.type === AST_NODE_TYPES.ArrayExpression) {
            checkStyleObjects(property.value);
          }
        } else {
          checkPropertyValue(property.value);
        }
      }
    }

    function checkPropertyValue(value: TSESTree.Property['value']) {
      if (
        value.type === AST_NODE_TYPES.MemberExpression &&
        !value.computed &&
        value.property.type === AST_NODE_TYPES.Identifier &&
        value.property.name === 'value'
      ) {
        context.report({ node: value, messageId: 'sharedValueInInlineStyle' });
      }
    }
  },
  meta: {
    docs: {
      description:
        "Don't read a shared value's `.value` in an inline style. Pass the shared value itself.",
    },
    messages: {
      sharedValueInInlineStyle:
        "It looks like you might be using shared value's .value inside an inline style. If you want a component to update when the shared value changes, use the shared value directly instead of its current state represented by `.value`. See https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/#animations-in-inline-styling",
    },
    type: 'suggestion',
    schema: [],
  },
};

export default rule;
