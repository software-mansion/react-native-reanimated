/** This file is required to properly resolve native dependencies */
import { getDependencies } from '../common-app/scripts/dependencies';

const { dependencies } = getDependencies();

module.exports = {
  dependencies,
  assets: ['./assets/fonts/'],
};
