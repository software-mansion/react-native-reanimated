import { jsVersion } from './jsVersion';

export function checkCppVersion() {
  const cppVersion = global._REANIMATED_VERSION_CPP;
  if (cppVersion === undefined) {
    throw new Error(
      `[Reanimated] Couldn't determine the version of the native part of Reanimated. Did you forget to re-build the app after upgrading react-native-reanimated? If you use Expo Go, you must use the exact version which is bundled into Expo SDK.`
    );
  }
  const ok = matchVersion(jsVersion, cppVersion);
  if (!ok) {
    throw new Error(
      `[Reanimated] Mismatch between JavaScript part and native part of Reanimated (${jsVersion} vs. ${cppVersion}). Did you forget to re-build the app after upgrading react-native-reanimated? If you use Expo Go, you must downgrade to ${cppVersion} which is bundled into Expo SDK.`
    );
  }
}

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
