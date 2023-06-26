#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <memory>

#include "NativeReanimatedModule.h"
#include "PropsRegistry.h"

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook : public UIManagerCommitHook {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<PropsRegistry> &propsRegistry,
      const std::shared_ptr<UIManager> &uiManager,
      const std::weak_ptr<NativeReanimatedModule> &weakNativeReanimatedModule)
      : propsRegistry_(propsRegistry), uiManager_(uiManager), weakNativeReanimatedModule_(weakNativeReanimatedModule) {}

  void commitHookWasRegistered(
      UIManager const &uiManager) const noexcept override {}

  void commitHookWasUnregistered(
      UIManager const &uiManager) const noexcept override {}

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode)
      const noexcept override;

  virtual ~ReanimatedCommitHook() noexcept = default;

 private:
  std::shared_ptr<PropsRegistry> propsRegistry_;

  std::shared_ptr<UIManager> uiManager_;
  
  std::weak_ptr<NativeReanimatedModule> weakNativeReanimatedModule_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
