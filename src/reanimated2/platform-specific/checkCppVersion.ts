'use strict';
import { jsVersion } from './jsVersion';

export function checkCppVersion() {
  const cppVersion = global._REANIMATED_VERSION_CPP;
  if (cppVersion === undefined) {
    console.warn(
      `[Reanimated] Couldn't determine the version of the native part of Reanimated.
    See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#couldnt-determine-the-version-of-the-native-part-of-reanimated\` for more details.`
    );
    return;
  }
  const ok = matchVersion(jsVersion, cppVersion);
  if (!ok) {
    throw new Error(
      `[Reanimated] Mismatch between JavaScript part and native part of Reanimated (${jsVersion} vs ${cppVersion}).
    See \`https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#mismatch-between-javascript-part-and-native-part-of-reanimated\` for more details.`
    );
  }
}

// This is used only in test files, therefore it is reported by ts-prune (which is desired)
// ts-prune-ignore-next
export function matchVersion(version1: string, version2: string) {
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
