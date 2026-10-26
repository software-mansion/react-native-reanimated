#pragma once

#include <reanimated/Fabric/MountedRootsRegistry.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/SynchronousWritesTracker.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>

#include <react/renderer/uimanager/UIManagerMountHook.h>

#include <memory>

namespace reanimated {

using namespace facebook::react;

class ReanimatedMountHook : public UIManagerMountHook {
 public:
  ReanimatedMountHook(
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
      const std::shared_ptr<MountedRootsRegistry> &mountedRootsRegistry,
      const std::shared_ptr<LayoutAnimationsProxyRegistry> &layoutAnimationsProxyRegistry,
      const std::shared_ptr<SynchronousWritesTracker> &synchronousWritesTracker,
      const std::function<void()> &requestFlush);
  ~ReanimatedMountHook() noexcept override;

  void shadowTreeDidMount(RootShadowNode::Shared const &rootShadowNode, HighResTimeStamp mountTime) noexcept override;

  void shadowTreeDidUnmount(SurfaceId surfaceId, HighResTimeStamp unmountTime) noexcept override;

 private:
  const std::shared_ptr<UIManager> uiManager_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  const std::shared_ptr<MountedRootsRegistry> mountedRootsRegistry_;
  const std::shared_ptr<LayoutAnimationsProxyRegistry> layoutAnimationsProxyRegistry_;
  const std::shared_ptr<SynchronousWritesTracker> synchronousWritesTracker_;
  const std::function<void()> requestFlush_;
};

} // namespace reanimated
