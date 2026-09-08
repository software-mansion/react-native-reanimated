#pragma once

#include <reanimated/Tools/FeatureFlags.h>

#include <string>

namespace reanimated {

#ifdef ANDROID
constexpr bool synchronousUpdatesEnabled() {
  return StaticFeatureFlags::getFlag("ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS");
}
#elif __APPLE__
constexpr bool synchronousUpdatesEnabled() {
  return StaticFeatureFlags::getFlag("IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS");
}
#else
constexpr bool synchronousUpdatesEnabled() {
  return false;
}
#endif

/// True for prop names that the synchronous path can apply directly to native
/// views, skipping the shadow tree.
bool isSynchronousPropName(const std::string &name);

} // namespace reanimated
