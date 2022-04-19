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

  bool has(ShadowNode::Shared shadowNode);

  void remove(Tag tag); // with ancestors

  void clear();

  void setParent(Tag parent, Tag child);

  std::lock_guard<std::mutex> createLock();

 private:
  std::unordered_map<Tag, ShadowNode::Shared> map_;
  mutable std::mutex mutex_; // Protects `map_`.

  std::unordered_map<Tag, Tag> map2_; // child -> tag
};

} // namespace reanimated
