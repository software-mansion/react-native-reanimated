#pragma once

#include <react/renderer/core/ShadowNode.h>
#include <map>
#include <memory>

using namespace facebook::react;

namespace reanimated {

class NewestShadowNodesRegistry {
 public:
  ShadowNode::Shared set(ShadowNode::Shared shadowNode);

  ShadowNode::Shared get(ShadowNode::Shared shadowNode);

  void remove(ShadowNode::Shared shadowNode);

 private:
  std::map<Tag, ShadowNode::Shared> map_; // TODO: synchronize access
};

} // namespace reanimated
