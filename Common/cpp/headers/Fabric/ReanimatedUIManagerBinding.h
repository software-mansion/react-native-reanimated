#pragma once

#include <ReactCommon/RuntimeExecutor.h>
#include <jsi/jsi.h>
#include <react/renderer/uimanager/UIManager.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <memory>

using namespace facebook;
using namespace react;

namespace reanimated {

class ReanimatedUIManagerBinding : public UIManagerBinding {
 public:
  static void createAndInstallIfNeeded(
      jsi::Runtime &runtime,
      RuntimeExecutor const &runtimeExecutor,
      std::shared_ptr<UIManager> const &uiManager);

  ReanimatedUIManagerBinding(
      std::shared_ptr<UIManager> uiManager,
      RuntimeExecutor runtimeExecutor);

  ~ReanimatedUIManagerBinding();

  void invalidate() const;

  jsi::Value get(jsi::Runtime &runtime, jsi::PropNameID const &name) override;

 private:
  std::shared_ptr<UIManager> uiManager_;
};

ShadowNode::Shared setNewestCloneOfShadowNodeFromReanimated(
    ShadowNode::Shared shadowNode);

void deleteNewestCloneOfShadowNodeFromReanimated(ShadowNode::Shared shadowNode);

} // namespace reanimated
