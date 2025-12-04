/** This file is required to properly resolve native dependencies */
const { getDependencies } = require('../common-app/scripts/dependencies');

function resolve(moduleName) {
  return require.resolve(`${moduleName}/package.json`);
}

const dependencies = getDependencies(__dirname, [], resolve);

// console.log(dependencies);

module.exports = {
  dependencies,
  assets: ['./assets/fonts/'],
};
