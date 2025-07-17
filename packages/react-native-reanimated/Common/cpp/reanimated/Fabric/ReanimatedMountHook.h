#pragma once

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
#if REACT_NATIVE_MINOR_VERSION >= 81
      HighResTimeStamp /*unmountTime*/
#else
      double /*unmountTime*/
#endif // REACT_NATIVE_MINOR_VERSION >= 81
      ) noexcept override;

 private:
  const std::shared_ptr<UIManager> uiManager_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;
  const std::function<void()> requestFlush_;
};

} // namespace reanimated
