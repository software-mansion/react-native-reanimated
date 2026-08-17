#pragma once

#include <reanimated/Fabric/ReanimatedSurfaceTracker.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <functional>
#include <memory>

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook : public UIManagerCommitHook {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
      const std::shared_ptr<LayoutAnimationsProxyCommon> &layoutAnimationsProxy,
      const std::shared_ptr<ReanimatedSurfaceTracker> &surfaceTracker,
      const std::function<void(SurfaceId)> &surfaceDidStart);

  ~ReanimatedCommitHook() noexcept override;

  void commitHookWasRegistered(UIManager const &) noexcept override {}

  void commitHookWasUnregistered(UIManager const &) noexcept override {}

  void maybeInitializeLayoutAnimations(const ShadowTree &shadowTree);

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode,
      const ShadowTreeCommitOptions &commitOptions) noexcept override;

 private:
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  std::shared_ptr<LayoutAnimationsProxyCommon> layoutAnimationsProxy_;
  std::shared_ptr<ReanimatedSurfaceTracker> surfaceTracker_;
  const std::function<void(SurfaceId)> surfaceDidStart_;
};

} // namespace reanimated
