function onFuncPrefixMatchingCreate(context) {
  return {
    JSXOpeningElement: (node) => {},
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
