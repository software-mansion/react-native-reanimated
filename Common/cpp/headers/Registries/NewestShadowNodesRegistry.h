#pragma once

#include <react/renderer/core/ShadowNode.h>
#include <memory>
#include <unordered_map>

using namespace facebook::react;

namespace reanimated {

class NewestShadowNodesRegistry {
 public:
  ShadowNode::Shared set(ShadowNode::Shared shadowNode);

  ShadowNode::Shared get(ShadowNode::Shared shadowNode);

  void remove(ShadowNode::Shared shadowNode);

 private:
  std::unordered_map<Tag, ShadowNode::Shared> map_;
  mutable std::mutex mutex_; // Protects `map_`.
};

} // namespace reanimated
