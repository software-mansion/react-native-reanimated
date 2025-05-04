#pragma once

#include <reanimated/Fabric/operations/OperationsLoop.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <memory>

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook
    : public UIManagerCommitHook,
      public std::enable_shared_from_this<ReanimatedCommitHook> {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
      const std::shared_ptr<LayoutAnimationsProxy> &layoutAnimationsProxy,
      const std::shared_ptr<OperationsLoop> &operationsLoop);

  ~ReanimatedCommitHook() noexcept override;

  void commitHookWasRegistered(UIManager const &) noexcept override {}

  void commitHookWasUnregistered(UIManager const &) noexcept override {}

  void maybeInitializeLayoutAnimations(SurfaceId surfaceId);

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode) noexcept override;

 private:
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy_;
  std::shared_ptr<OperationsLoop> operationsLoop_;
  SurfaceId currentMaxSurfaceId_ = -1;

  std::mutex mutex_; // Protects `currentMaxSurfaceId_`.
};

} // namespace reanimated
