#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <memory>

namespace reanimated {

class ReanimatedCommitHook : public facebook::react::UIManagerCommitHook {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<PropsRegistry> &propsRegistry,
      const std::shared_ptr<facebook::react::UIManager> &uiManager,
      const std::shared_ptr<LayoutAnimationsProxy> &layoutAnimationsProxy);

  ~ReanimatedCommitHook() noexcept override;

#if REACT_NATIVE_MINOR_VERSION >= 73
  void commitHookWasRegistered(
      facebook::react::UIManager const &) noexcept override {}

  void commitHookWasUnregistered(
      facebook::react::UIManager const &) noexcept override {}

  facebook::react::RootShadowNode::Unshared shadowTreeWillCommit(
      facebook::react::ShadowTree const &shadowTree,
      facebook::react::RootShadowNode::Shared const &oldRootShadowNode,
      facebook::react::RootShadowNode::Unshared const
          &newRootShadowNode) noexcept override;
#else
  void commitHookWasRegistered(UIManager const &) const noexcept override {}

  void commitHookWasUnregistered(UIManager const &) const noexcept override {}

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode)
      const noexcept override;
#endif

 private:
  std::shared_ptr<PropsRegistry> propsRegistry_;

  std::shared_ptr<facebook::react::UIManager> uiManager_;

  std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy_;

  facebook::react::SurfaceId currentMaxSurfaceId_ = -1;

  std::mutex mutex_; // Protects `currentMaxSurfaceId_`.
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
