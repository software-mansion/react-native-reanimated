#pragma once

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <memory>

#include "PropsRegistry.h"

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook : public UIManagerCommitHook {
 public:
  explicit ReanimatedCommitHook(std::shared_ptr<PropsRegistry> propsRegistry)
      : propsRegistry_(propsRegistry) {}

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
};

} // namespace reanimated
