#pragma once

#include <react/renderer/core/ComponentDescriptor.h>
#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <reanimated/Fabric/ShadowTree/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <memory>
#include <unordered_map>
#include <vector>

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook
    : public UIManagerCommitHook,
      public std::enable_shared_from_this<ReanimatedCommitHook> {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const std::shared_ptr<LayoutAnimationsProxy> &layoutAnimationsProxy);

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
  std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy_;

  SurfaceId currentMaxSurfaceId_ = -1;

  std::mutex mutex_; // Protects `currentMaxSurfaceId_`.
};

} // namespace reanimated
