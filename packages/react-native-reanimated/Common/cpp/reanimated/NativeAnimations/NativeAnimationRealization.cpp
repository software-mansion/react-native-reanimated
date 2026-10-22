#include <reanimated/NativeAnimations/NativeAnimationRealization.h>

#include <algorithm>

namespace reanimated::native_animation {

bool modelHoldsOnlyProp(const facebook::react::ViewProps &viewProps, const AnimationTarget target) {
  return target != AnimationTarget::Opacity ||
      std::ranges::none_of(viewProps.filter, [](const facebook::react::FilterFunction &filter) {
           return filter.type == facebook::react::FilterType::Opacity;
         });
}

} // namespace reanimated::native_animation
