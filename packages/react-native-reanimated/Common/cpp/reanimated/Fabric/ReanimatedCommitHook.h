#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>
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
      const std::shared_ptr<PropsRegistry> &propsRegistry,
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<LayoutAnimationsProxy> &layoutAnimationsProxy);

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
  std::shared_ptr<PropsRegistry> propsRegistry_;

  std::shared_ptr<UIManager> uiManager_;

  std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy_;

  SurfaceId currentMaxSurfaceId_ = -1;

  std::mutex mutex_; // Protects `currentMaxSurfaceId_`.
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
