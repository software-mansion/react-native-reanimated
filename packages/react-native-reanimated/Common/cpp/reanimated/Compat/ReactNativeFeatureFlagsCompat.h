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

template <typename TFeatureFlags = facebook::react::ReactNativeFeatureFlags>
bool isMountingCoordinatorPullModelEnabled() {
  if constexpr (HasMountingCoordinatorPullModelAndroidFlag<TFeatureFlags>) {
    return TFeatureFlags::enableMountingCoordinatorPullModelAndroid();
  } else {
    return false;
  }
}

} // namespace reanimated
