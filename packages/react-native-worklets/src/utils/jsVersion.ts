'use strict';
import packageJson from '../../package.json';

const getJsVersion = () => {
  return packageJson.version;
};

export { getJsVersion };
