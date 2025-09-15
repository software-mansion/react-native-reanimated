'use strict';

import { logger } from '../logger';
import { WorkletsError } from '../WorkletsError';
import { jsVersion } from './jsVersion';
export function checkCppVersion() {
  const cppVersion = global._WORKLETS_VERSION_CPP;
  if (cppVersion === undefined) {
    logger.warn(`Couldn't determine the version of the native part of Worklets.
    See \`https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#couldnt-determine-the-version-of-the-native-part-of-worklets\` for more details.`);
    return;
  }
  const ok = matchVersion(jsVersion, cppVersion);
  if (!ok) {
    throw new WorkletsError(`Mismatch between JavaScript part and native part of Worklets (${jsVersion} vs ${cppVersion}).
    See \`https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#mismatch-between-javascript-part-and-native-part-of-worklets\` for more details.`);
  }
}
export function matchVersion(version1, version2) {
  if (version1.match(/^\d+\.\d+\.\d+$/) && version2.match(/^\d+\.\d+\.\d+$/)) {
    // x.y.z, compare only major and minor, skip patch
    const [major1, minor1] = version1.split('.');
    const [major2, minor2] = version2.split('.');
    return major1 === major2 && minor1 === minor2;
  } else {
    // alpha, beta or rc, compare everything
    return version1 === version2;
  }
}
//# sourceMappingURL=checkCppVersion.js.map