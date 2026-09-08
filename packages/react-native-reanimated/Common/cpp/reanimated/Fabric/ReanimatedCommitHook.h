#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <memory>
#include <unordered_map>
#include <utility>

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook : public UIManagerCommitHook {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
      const std::shared_ptr<LayoutAnimationsProxyRegistry> &layoutAnimationsProxyRegistry);

  ~ReanimatedCommitHook() noexcept override;

  void commitHookWasRegistered(UIManager const &) noexcept override {}

  void commitHookWasUnregistered(UIManager const &) noexcept override {}

  std::shared_ptr<LayoutAnimationsProxyCommon> registerLayoutAnimations(const ShadowTree &shadowTree);

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode,
      const ShadowTreeCommitOptions &commitOptions) noexcept override;

 private:
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  std::shared_ptr<LayoutAnimationsProxyRegistry> layoutAnimationsProxyRegistry_;

  /// Last produced root per surface with the pending-store version it
  /// carries. A commit based on that root with an unchanged version needs no
  /// new clone. Guarded by the manager lock.
  std::unordered_map<SurfaceId, std::pair<uint64_t, std::weak_ptr<const RootShadowNode>>> pendingCarriedRoots_;
};

} // namespace reanimated
