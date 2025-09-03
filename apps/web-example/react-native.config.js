/** This file is required to properly resolve native dependencies */
import { getDependencies } from '../common-app/scripts/dependencies';

const dependencies = getDependencies(__dirname);

module.exports = {
  dependencies,
  assets: ['./assets/fonts/'],
};
