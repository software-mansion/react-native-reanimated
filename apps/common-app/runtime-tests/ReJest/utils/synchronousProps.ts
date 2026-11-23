import { Platform } from 'react-native';
import { getStaticFeatureFlag } from 'react-native-reanimated';

export function commitsSynchronousProps() {
  const synchronousFlag =
    Platform.OS === 'ios'
      ? 'IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS'
      : 'ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS';
  return (
    !getStaticFeatureFlag('USE_ANIMATION_BACKEND') &&
    !getStaticFeatureFlag(synchronousFlag)
  );
}
