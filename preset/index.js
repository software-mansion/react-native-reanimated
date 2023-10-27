module.exports = function (api) {
  const platform = api.caller(getPlatform);
  const isWeb = platform === 'web';

  return {
    plugins: [['../plugin', { isWeb }]],
  };
};

function getPlatform(caller) {
  return caller && (caller.platform ?? caller.target);
}
