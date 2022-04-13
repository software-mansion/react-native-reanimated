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

  const ShadowNode &get(const ShadowNode &shadowNode);

  void remove(ShadowNode::Shared shadowNode);

  void clear();

  std::lock_guard<std::mutex> createLock();

 private:
  std::unordered_map<Tag, ShadowNode::Shared> map_;
  mutable std::mutex mutex_; // Protects `map_`.
};

} // namespace reanimated
