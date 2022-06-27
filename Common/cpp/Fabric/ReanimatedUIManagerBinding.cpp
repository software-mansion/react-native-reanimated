#ifdef RCT_NEW_ARCH_ENABLED

#include "ReanimatedUIManagerBinding.h"
#include "FabricUtils.h"

using namespace facebook;
using namespace react;

namespace reanimated {

void ReanimatedUIManagerBinding::createAndInstallIfNeeded(
    jsi::Runtime &runtime,
    RuntimeExecutor const &runtimeExecutor,
    std::shared_ptr<UIManager> const &uiManager) {
  // adapted from UIManagerBinding.cpp
  auto uiManagerModuleName = "nativeFabricUIManager";
  auto uiManagerBinding =
      std::make_shared<ReanimatedUIManagerBinding>(uiManager, runtimeExecutor);
  auto object = jsi::Object::createFromHostObject(runtime, uiManagerBinding);
  runtime.global().setProperty(runtime, uiManagerModuleName, std::move(object));
}

ReanimatedUIManagerBinding::ReanimatedUIManagerBinding(
    std::shared_ptr<UIManager> uiManager,
    RuntimeExecutor runtimeExecutor)
    : UIManagerBinding(uiManager, runtimeExecutor),
      uiManager_(std::move(uiManager)) {}

ReanimatedUIManagerBinding::~ReanimatedUIManagerBinding() {}

void ReanimatedUIManagerBinding::invalidate() const {
  uiManager_->setDelegate(nullptr);
}

jsi::Value ReanimatedUIManagerBinding::get(
    jsi::Runtime &runtime,
    jsi::PropNameID const &name) {
  // Currently, we need to overwrite all variants of `cloneNode` as well as
  // `appendChild` to prevent React from overwriting layout props animated using
  // Reanimated. However, this may degrade performance due to using locks.
  // We already have an idea how this can be done better without locks
  // (i.e. by overwriting `completeRoot` and using UIManagerCommitHooks).

  // based on implementation from UIManagerBinding.cpp
  auto methodName = name.utf8(runtime);
  UIManager *uiManager = uiManager_.get();

  // Methods like "findNodeAtPoint", "getRelativeLayoutMetrics", "measure" etc.
  // use `UIManager::getNewestCloneOfShadowNode` or
  // `ShadowTree::getCurrentRevision` under the hood,
  // so there's no need to overwrite them.

  return UIManagerBinding::get(runtime, name);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
