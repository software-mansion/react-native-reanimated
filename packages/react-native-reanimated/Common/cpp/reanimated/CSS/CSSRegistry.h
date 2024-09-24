#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <reanimated/CSS/CSSAnimation.h>

#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

using UpdatesBatch =
    std::vector<std::pair<ShadowNode::Shared, std::unique_ptr<jsi::Value>>>;

class CSSRegistry {
 public:
  void add(
      jsi::Runtime &rt,
      const unsigned id,
      const std::shared_ptr<CSSAnimation> &animation,
      const jsi::Value &viewStyle);

  void finish(const unsigned id, const bool revertChanges);

  UpdatesBatch update(jsi::Runtime &rt, const double timestamp);

  bool isEmpty() const;

  bool isCssLoopRunning() const;

  void setCssLoopRunning(const bool running);

 private:
  std::unordered_map<unsigned, std::shared_ptr<CSSAnimation>> registry_;
  std::vector<unsigned> removalQueue_;
  bool cssLoopRunning_ = false;

  void markForRemoval(const unsigned id);

  void runMarkedRemoval();
};

} // namespace reanimated
