#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include "LayoutAnimationsProxy.h"

#include <memory>

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook : public UIManagerCommitHook {
 public:
  ReanimatedCommitHook(
      std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy)
      : layoutAnimationsProxy_(layoutAnimationsProxy) {}

  void commitHookWasRegistered(
      UIManager const &uiManager) const noexcept override {}

  void commitHookWasUnregistered(
      UIManager const &uiManager) const noexcept override {}

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode)
      const noexcept override;

  virtual ~ReanimatedCommitHook() noexcept = default;

 private:
  std::weak_ptr<LayoutAnimationsProxy> layoutAnimationsProxy_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
