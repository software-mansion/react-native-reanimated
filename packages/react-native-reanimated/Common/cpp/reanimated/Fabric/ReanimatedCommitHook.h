#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>

#include <react/renderer/uimanager/UIManagerCommitHook.h>
#include <react/renderer/uimanager/UIManagerMountHook.h>

#include <memory>
#include <unordered_set>

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook : public UIManagerCommitHook, public UIManagerMountHook {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
      const std::shared_ptr<LayoutAnimationsProxyCommon> &layoutAnimationsProxy);

  ~ReanimatedCommitHook() noexcept override;

  void commitHookWasRegistered(UIManager const &) noexcept override {}

  void commitHookWasUnregistered(UIManager const &) noexcept override {}

  void maybeInitializeLayoutAnimations(const ShadowTree &shadowTree);

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode,
      const ShadowTreeCommitOptions &commitOptions) noexcept override;

  void shadowTreeDidMount(RootShadowNode::Shared const &, HighResTimeStamp) noexcept override {}

  void shadowTreeDidUnmount(SurfaceId surfaceId, HighResTimeStamp unmountTime) noexcept override;

 private:
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  std::shared_ptr<LayoutAnimationsProxyCommon> layoutAnimationsProxy_;

  // Surfaces whose MountingCoordinator already has our override delegate.
  std::unordered_set<SurfaceId> seenSurfaces_;

  std::mutex mutex_; // Protects `seenSurfaces_`.
};

} // namespace reanimated
