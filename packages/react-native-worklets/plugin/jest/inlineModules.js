const INLINE_MODULE_PREFIX = 'metro:inline;base64,';
const INLINE_MODULE_PATTERN = /metro:inline;base64,([A-Za-z0-9+/=]+)/g;

/**
 * @param {string} code
 * @returns {{ specifier: string; content: string }[]}
 */
function generatedModules(code) {
  return Array.from(
    code.matchAll(INLINE_MODULE_PATTERN),
    ([specifier, payload]) => ({
      specifier,
      content: Buffer.from(payload, 'base64').toString('utf8'),
    })
  ).flatMap((module) => [module, ...generatedModules(module.content)]);
}

/**
 * @param {string} code
 * @returns {string}
 */
function redactGeneratedModules(code) {
  const positions = new Map();
  return code.replace(INLINE_MODULE_PATTERN, (specifier) => {
    if (!positions.has(specifier)) {
      positions.set(specifier, positions.size + 1);
    }
    return `${INLINE_MODULE_PREFIX}<module ${positions.get(specifier)}>`;
  });
}

module.exports = {
  INLINE_MODULE_PREFIX,
  generatedModules,
  redactGeneratedModules,
};
