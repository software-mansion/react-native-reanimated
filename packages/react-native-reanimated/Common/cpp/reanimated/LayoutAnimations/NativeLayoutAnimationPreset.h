#pragma once

#include <react/renderer/graphics/Rect.h>

namespace reanimated {

struct PresetFrameTransform {
  facebook::react::Rect oldFrame;
  facebook::react::Rect newFrame;
};

class NativeLayoutAnimationPreset {
 public:
  virtual PresetFrameTransform calculate(
      const facebook::react::Rect &oldFrame,
      const facebook::react::Rect &newFrame) const = 0;

  virtual ~NativeLayoutAnimationPreset() = default;
};

} // namespace reanimated
