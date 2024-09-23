#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <reanimated/CSS/CSSAnimation.h>
#include <reanimated/CSS/CSSAnimationsRegistry.h>

#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

using UpdatesBatch =
    std::vector<std::pair<ShadowNode::Shared, std::unique_ptr<jsi::Value>>>;

class CSSAnimationsRegistry {
 public:
  void addAnimation(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      const unsigned id,
      const CSSAnimationConfig &config,
      const jsi::Value &viewStyle);

  void removeAnimation(const unsigned id);

  UpdatesBatch updateAnimations(jsi::Runtime &rt, const double timestamp);

  bool isEmpty() const;

  bool isCssLoopRunning() const;

  void setCssLoopRunning(const bool running);

 private:
  std::unordered_map<unsigned, CSSAnimation> registry_;
  std::vector<unsigned> removalQueue_;
  bool cssLoopRunning_ = false;

  void markForRemoval(const unsigned id);

  void runMarkedRemoval();
};

} // namespace reanimated
