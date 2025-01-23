const path = require('path');

function resolveDependencies(dependencies = {}) {
  return Object.fromEntries(
    Object.keys(dependencies).map((name) => [
      name,
      { root: path.resolve(__dirname, `../../../node_modules/${name}`) },
    ])
  );
}

function getDependencies() {
  const commonAppDir = path.resolve(__dirname, '../../common-app');
  const commonAppPkg = require(path.resolve(commonAppDir, 'package.json'));

  // Get all common-app dependencies
  const dependencies = resolveDependencies(commonAppPkg.dependencies);
  const devDependencies = resolveDependencies(commonAppPkg.devDependencies);

  return { ...devDependencies, ...dependencies };
}

module.exports = {
  getDependencies,
};
