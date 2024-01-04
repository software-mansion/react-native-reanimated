const { onFuncPrefixMatchingCreate } = require('./funcPrefixMatching');
module.exports = {
  rules: {
    'func-prefix-matching': {
      create: onFuncPrefixMatchingCreate,
    },
  },
};
