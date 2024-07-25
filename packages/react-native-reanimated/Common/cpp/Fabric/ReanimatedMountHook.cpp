#if defined(RCT_NEW_ARCH_ENABLED) && REACT_NATIVE_MINOR_VERSION >= 73

#include "ReanimatedMountHook.h"

namespace reanimated {

ReanimatedMountHook::ReanimatedMountHook(
    const std::shared_ptr<PropsRegistry> &propsRegistry,
    const std::shared_ptr<UIManager> &uiManager)
    : propsRegistry_(propsRegistry), uiManager_(uiManager) {
  uiManager_->registerMountHook(*this);
}

ReanimatedMountHook::~ReanimatedMountHook() noexcept {
  uiManager_->unregisterMountHook(*this);
}

void ReanimatedMountHook::shadowTreeDidMount(
    RootShadowNode::Shared const &,
    double) noexcept {}

} // namespace reanimated

#endif // defined(RCT_NEW_ARCH_ENABLED) && REACT_NATIVE_MINOR_VERSION >= 73
