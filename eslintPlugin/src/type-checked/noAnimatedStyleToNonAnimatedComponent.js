'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var rule = {
  create: function (context) {
    return {
      Identifier: function (node) {
        context.report({
          messageId: 'loopOverEnum',
          node: node,
        });
      },
    };
  },
  meta: {
    docs: {
      recommended: 'error',
      description: 'Avoid looping over enums.',
    },
    messages: {
      loopOverEnum: 'Do not loop over enums.',
    },
    type: 'suggestion',
    schema: [],
  },
  defaultOptions: [],
};
exports.default = rule;
