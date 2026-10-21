#include <reanimated/android/CSS/AndroidCSSRouteTable.h>
#include <reanimated/android/NativeAnimations/AndroidNativeAnimationPlatform.h>

#include <android/api-level.h>

#include <utility>
#include <vector>

namespace reanimated::css {

using namespace native_animation;

CSSPlatformRouteTable makeAndroidCSSRouteTable(const int apiLevel, std::function<bool()> animatorsEnabled) {
  CSSPlatformRouteTable routeTable{
      .targets =
          {
              {"opacity", AnimationTarget::Opacity},
              {"backgroundColor", AnimationTarget::BackgroundColor},
              {"borderColor", AnimationTarget::BorderColor},
              {"borderRadius", AnimationTarget::BorderRadius},
          },
      .timingKinds = std::vector(kAnimatorTimingKinds.begin(), kAnimatorTimingKinds.end()),
      .isAvailable = std::move(animatorsEnabled),
  };
  if (apiLevel >= __ANDROID_API_P__) {
    routeTable.targets.emplace("shadowColor", AnimationTarget::ShadowColor);
  }
  return routeTable;
}

} // namespace reanimated::css
