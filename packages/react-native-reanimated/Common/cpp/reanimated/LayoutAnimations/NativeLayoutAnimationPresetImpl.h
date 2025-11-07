
#include "reanimated/LayoutAnimations/NativeLayoutAnimationPreset.h"

namespace reanimated {

// Entering

class SlideInLeftPreset : public NativeLayoutAnimationPreset {
 public:
  PresetFrameTransform calculate(
      const facebook::react::Rect &oldFrame,
      const facebook::react::Rect &newFrame) const override {
    auto result = PresetFrameTransform{oldFrame, newFrame};
    result.oldFrame.origin.x = newFrame.origin.x - newFrame.size.width;
    return result;
  }
};

// Exiting

class SlideOutRightPreset : public NativeLayoutAnimationPreset {
 public:
  PresetFrameTransform calculate(
      const facebook::react::Rect &oldFrame,
      const facebook::react::Rect &newFrame) const override {
    auto result = PresetFrameTransform{oldFrame, newFrame};
    result.newFrame.origin.x = oldFrame.origin.x + oldFrame.size.width;
    return result;
  }
};

// Layout

class LinearTransitionPreset : public NativeLayoutAnimationPreset {
 public:
  PresetFrameTransform calculate(
      const facebook::react::Rect &oldFrame,
      const facebook::react::Rect &newFrame) const override {
    return PresetFrameTransform{oldFrame, newFrame};
  }
};

} // namespace reanimated
