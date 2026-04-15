#pragma once

#include <react/renderer/graphics/Rect.h>
#include <reanimated/LayoutAnimations/NativeLayoutAnimation.h>

namespace reanimated {

class NativeLayoutAnimationPreset {
 public:
  virtual std::vector<NativeLayoutAnimation> calculate(
      const facebook::react::Rect &oldFrame,
      const facebook::react::Rect &newFrame) const = 0;

  virtual ~NativeLayoutAnimationPreset() = default;
};

} // namespace reanimated
