#pragma once

#include <react/featureflags/ReactNativeFeatureFlags.h>

#include <concepts>

namespace reanimated {

// `enableMountingCoordinatorPullModelAndroid` was added in
// https://github.com/facebook/react-native/commit/ece0efe837943f82e0dc49bbfe4b8ce40d159a29
// will be available in React Native 0.88
template <typename TFeatureFlags>
concept HasMountingCoordinatorPullModelAndroidFlag = requires {
  { TFeatureFlags::enableMountingCoordinatorPullModelAndroid() } -> std::convertible_to<bool>;
};

template <typename TFeatureFlags>
concept HasAccumulatedUpdatesInRawPropsAndroidFlag = requires {
  { TFeatureFlags::enableAccumulatedUpdatesInRawPropsAndroid() } -> std::convertible_to<bool>;
};

/// True when each React commit pulls on the UI thread, in the mount of its transaction.
template <typename TFeatureFlags = facebook::react::ReactNativeFeatureFlags>
bool pullsOnMountThread() {
#ifdef ANDROID
  if constexpr (
      HasMountingCoordinatorPullModelAndroidFlag<TFeatureFlags> &&
      HasAccumulatedUpdatesInRawPropsAndroidFlag<TFeatureFlags>) {
    return TFeatureFlags::enableMountingCoordinatorPullModelAndroid() &&
        TFeatureFlags::enableAccumulatedUpdatesInRawPropsAndroid();
  } else {
    return false;
  }
#else
  return true;
#endif
}

} // namespace reanimated
