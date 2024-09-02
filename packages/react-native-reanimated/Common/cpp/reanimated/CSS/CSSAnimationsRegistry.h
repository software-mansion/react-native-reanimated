#pragma once

#include <reanimated/CSS/EasingFunctions.h>

#include <reanimated/CSS/CSSAnimation.h>
#include <reanimated/CSS/CSSAnimationsRegistry.h>
#include <reanimated/CSS/CSSAnimationsTagManager.h>

#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

class CSSAnimationsRegistry {
 public:
  std::unordered_map<unsigned int, CSSAnimation> registry_;

  void addAnimation(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      const CSSAnimationConfig &config);
  void markForRemoval(const unsigned int tag);
  void runMarkedRemoval();
  bool isCssLoopRunning() const;
  void setCssLoopRunning(const bool running);

 private:
  CSSAnimationsTagManager tagManager_;
  std::vector<unsigned int> removalQueue_;
  bool cssLoopRunning_ = false;
};

} // namespace reanimated
