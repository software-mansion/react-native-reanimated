// In order to keep bundle size down, we treat this file as a polyfill for Web.

import { shouldBeUseWeb } from '../PlatformChecker';
const initializeGlobalsForWeb = () => {
  if (shouldBeUseWeb()) {
    // do nothing
  }
  return true;
};

/*
  If a file doesn't export anything, tree shaking doesn't pack
  it into the JS bundle. In effect, the code inside of this file
  will never execute. That is why we wrapped initialization code
  into a function, and we call this one during creating
  the module export object.
*/

export default initializeGlobalsForWeb();
