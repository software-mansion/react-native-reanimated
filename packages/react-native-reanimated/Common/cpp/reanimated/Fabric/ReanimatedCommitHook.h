#pragma once

#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/Fabric/updates/SynchronousWritesTracker.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <memory>

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook : public UIManagerCommitHook {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
      const std::shared_ptr<css::ViewStylesRepository> &viewStylesRepository,
      const std::shared_ptr<LayoutAnimationsProxyRegistry> &layoutAnimationsProxyRegistry,
      const std::shared_ptr<SynchronousWritesTracker> &synchronousWritesTracker);

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
  void trackCommit(const RootShadowNode::Shared &rootShadowNode, bool carriesRegistryValues) const;

  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  std::shared_ptr<css::ViewStylesRepository> viewStylesRepository_;
  std::shared_ptr<LayoutAnimationsProxyRegistry> layoutAnimationsProxyRegistry_;
  std::shared_ptr<SynchronousWritesTracker> synchronousWritesTracker_;
};

} // namespace reanimated
