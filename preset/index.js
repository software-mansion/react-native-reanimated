module.exports = function (api) {
  return {
    plugins: [['../plugin', { isWeb: isWeb(api.caller) }]],
  };
};

function isWeb(caller) {
  return caller && (caller.platform ?? caller.target) === 'web';
}
