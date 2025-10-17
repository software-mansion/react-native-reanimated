#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.h>

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
      const std::shared_ptr<UpdatesRegistryManager>
          &updatesRegistryManagerLegacy,
      const std::shared_ptr<LayoutAnimationsProxy_Legacy>
          &layoutAnimationsProxy,
      const std::shared_ptr<
          reanimated_experimental::LayoutAnimationsProxy_Experimental>
          &layoutAnimationsProxyExperimental);

  ~ReanimatedCommitHook() noexcept override;

  void commitHookWasRegistered(UIManager const &) noexcept override {}

  void commitHookWasUnregistered(UIManager const &) noexcept override {}

  void maybeInitializeLayoutAnimations(SurfaceId surfaceId);

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode
#if REACT_NATIVE_MINOR_VERSION >= 80
      ,
      const ShadowTreeCommitOptions &commitOptions
#endif
      ) noexcept override;

 private:
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  std::shared_ptr<reanimated_experimental::LayoutAnimationsProxy_Experimental>
      layoutAnimationsProxyExperimental_;
  std::shared_ptr<LayoutAnimationsProxy_Legacy> layoutAnimationsProxyLegacy_;

  SurfaceId currentMaxSurfaceId_ = -1;

  std::mutex mutex_; // Protects `currentMaxSurfaceId_`.
};

} // namespace reanimated
