#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <react/renderer/uimanager/UIManagerMountHook.h>

#include <memory>

namespace reanimated {

using namespace facebook::react;

class ReanimatedMountHook : public UIManagerMountHook {
 public:
  ReanimatedMountHook(
      const std::shared_ptr<PropsRegistry> &propsRegistry,
      const std::shared_ptr<UIManager> &uiManager);
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
  const std::shared_ptr<PropsRegistry> propsRegistry_;
  const std::shared_ptr<UIManager> uiManager_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
