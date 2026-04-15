#pragma once

#include <functional>
#include <string>
#include <vector>
#include "reanimated/LayoutAnimations/NativeLayoutAnimation.h"
#include "reanimated/LayoutAnimations/NativeLayoutAnimationPreset.h"

namespace reanimated {

// TODO: For the sliding ones, use window width - basically the same
// implementation we have in TS now

// Entering

class SlideInLeftPreset : public NativeLayoutAnimationPreset {
 public:
  std::vector<NativeLayoutAnimation> calculate(
      const facebook::react::Rect &oldFrame,
      const facebook::react::Rect &newFrame) const override {
    std::vector<NativeLayoutAnimation> result;

    // TODO: Should be reusable?, it's here and in REANodesManager
    double centerOffsetX = oldFrame.size.width / 2;
    double centerOffsetY = oldFrame.size.height / 2;

    result.push_back(NativeLayoutAnimation{
        "position.x",
        [newFrame,
         centerOffsetX](const facebook::react::Rect &baseFrame) -> double {
          return newFrame.origin.x + centerOffsetX - newFrame.size.width;
        },
        newFrame.origin.x + centerOffsetX});

    result.push_back(NativeLayoutAnimation{
        "position.y",
        [newFrame, centerOffsetY](const facebook::react::Rect &baseFrame)
            -> double { return newFrame.origin.y + centerOffsetY; },
        newFrame.origin.y + centerOffsetY});

    return result;
  }
};

// Exiting

class SlideOutRightPreset : public NativeLayoutAnimationPreset {
 public:
  std::vector<NativeLayoutAnimation> calculate(
      const facebook::react::Rect &oldFrame,
      const facebook::react::Rect &newFrame) const override {
    std::vector<NativeLayoutAnimation> result;

    // TODO: Should be reusable?, it's here and in REANodesManager
    double centerOffsetX = oldFrame.size.width / 2;
    double centerOffsetY = oldFrame.size.height / 2;

    result.push_back(NativeLayoutAnimation{
        "position.x",
        [centerOffsetX](const facebook::react::Rect &baseFrame) -> double {
          return baseFrame.origin.x + centerOffsetX;
        },
        newFrame.origin.x + oldFrame.size.width + centerOffsetX});

    result.push_back(NativeLayoutAnimation{
        "position.y",
        [centerOffsetY](const facebook::react::Rect &baseFrame) -> double {
          return baseFrame.origin.y + centerOffsetY;
        },
        newFrame.origin.y + centerOffsetY});

    return result;
  }
};

// Layout

class LinearTransitionPreset : public NativeLayoutAnimationPreset {
 public:
  std::vector<NativeLayoutAnimation> calculate(
      const facebook::react::Rect &oldFrame,
      const facebook::react::Rect &newFrame) const override {
    std::vector<NativeLayoutAnimation> result;

    // TODO: Should be reusable?, it's here and in REANodesManager
    double centerOffsetX = oldFrame.size.width / 2;
    double centerOffsetY = oldFrame.size.height / 2;

    result.push_back(NativeLayoutAnimation{
        "position.x",
        [centerOffsetX](const facebook::react::Rect &baseFrame) -> double {
          return baseFrame.origin.x + centerOffsetX;
        },
        newFrame.origin.x + centerOffsetX});

    result.push_back(NativeLayoutAnimation{
        "position.y",
        [centerOffsetY](const facebook::react::Rect &baseFrame) -> double {
          return baseFrame.origin.y + centerOffsetY;
        },
        newFrame.origin.y + centerOffsetY});

    return result;
  }
};

} // namespace reanimated
