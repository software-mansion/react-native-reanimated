#pragma once

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <chrono>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

enum CSSAnimationState { pending, running, finished };

class CSSAnimationsRegistry {
 public:
  std::vector<std::tuple<ShadowNode::Shared, folly::dynamic, CSSAnimationState>>
      registry_;
  std::unordered_map<Tag, time_t> startTimes_;
};

} // namespace reanimated
