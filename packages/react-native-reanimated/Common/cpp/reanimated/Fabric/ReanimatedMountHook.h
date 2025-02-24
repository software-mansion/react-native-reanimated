#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <react/renderer/uimanager/UIManagerMountHook.h>

#include <memory>

namespace reanimated {

using namespace facebook::react;

class ReanimatedMountHook : public UIManagerMountHook {
 public:
  ReanimatedMountHook(
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
      const std::function<void()> &requestFlush);
  ~ReanimatedMountHook() noexcept override;

  void shadowTreeDidMount(
      RootShadowNode::Shared const &rootShadowNode,
      double mountTime) noexcept override;

 private:
  const std::shared_ptr<UIManager> uiManager_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  const std::function<void()> requestFlush_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
