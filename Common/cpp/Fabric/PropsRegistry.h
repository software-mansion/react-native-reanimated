#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/ShadowNode.h>

using namespace facebook;
using namespace react;

namespace reanimated {

class PropsRegistry {
 public:
  void setLastReanimatedRoot(
      RootShadowNode::Shared const &lastReanimatedRoot) noexcept {
    // TODO: synchronize with mutex?
    lastReanimatedRoot_ = lastReanimatedRoot;
  }

  bool isLastReanimatedRoot(
      RootShadowNode::Shared const &newRootShadowNode) const noexcept {
    // TODO: synchronize with mutex?
    return newRootShadowNode == lastReanimatedRoot_;
  }

 private:
  RootShadowNode::Shared lastReanimatedRoot_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
