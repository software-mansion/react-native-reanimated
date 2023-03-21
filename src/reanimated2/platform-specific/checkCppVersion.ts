/**
 * Checks that native and js versions of reanimated match.
 */
import { jsVersion } from './jsVersion';
import { matchVersion } from './utils';

function checkCppVersion(): void {
  const cppVersion = global._REANIMATED_VERSION_CPP;
  if (cppVersion === undefined) {
    console.error(
      `[Reanimated] Couldn't determine the version of the native part of Reanimated. Did you forget to re-build the app after upgrading react-native-reanimated? If you use Expo Go, you must use the exact version which is bundled into Expo SDK.`
    );
    return;
  }
  const ok = matchVersion(jsVersion, cppVersion);
  if (!ok) {
    console.error(
      `[Reanimated] Mismatch between JavaScript part and native part of Reanimated (${jsVersion} vs. ${cppVersion}). Did you forget to re-build the app after upgrading react-native-reanimated? If you use Expo Go, you must downgrade to ${cppVersion} which is bundled into Expo SDK.`
    );
  }
}

export { checkCppVersion };
