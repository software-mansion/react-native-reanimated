#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <reanimated/CSS/registries/CSSAnimationsRegistry.h>
#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <worklets/Compat/StableApi.h>

#include <utility>

namespace reanimated {

using namespace worklets;

OperationsLoop::OperationsLoop(
    const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
    const RequestRenderFunction &requestRender,
    const GetAnimationTimestampFunction &getTimestamp,
    const std::shared_ptr<css::CSSAnimationsRegistry> &cssAnimationsRegistry,
    const std::shared_ptr<css::CSSTransitionsRegistry> &cssTransitionsRegistry,
    const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager)
    : uiScheduler_(uiScheduler),
      requestRender_(requestRender),
      getTimestamp_(getTimestamp),
      cssAnimationsRegistry_(cssAnimationsRegistry),
      cssTransitionsRegistry_(cssTransitionsRegistry),
      updatesRegistryManager_(updatesRegistryManager) {}

double OperationsLoop::resolveTimestamp() {
  if (running_) {
    return currentTimestamp_;
  }
  currentTimestamp_ = getTimestamp_();
  return currentTimestamp_;
}

void OperationsLoop::run() {
  if (running_) {
    return;
  }
  running_ = true;

  scheduleOnUI(uiScheduler_, [weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }
    strongThis->requestRender_([weakThis](double /*timestampMs*/) {
      if (auto strongThis = weakThis.lock()) {
        strongThis->onRender();
      }
    });
  });
}

bool OperationsLoop::shouldUpdateCssAnimations() const {
  return shouldUpdateCssAnimations_;
}

void OperationsLoop::clearShouldUpdateCssAnimations() {
  shouldUpdateCssAnimations_ = false;
}

bool OperationsLoop::hasPendingUpdates() const {
  return cssAnimationsRegistry_->hasUpdates() || cssTransitionsRegistry_->hasUpdates()
#ifdef ANDROID
      || updatesRegistryManager_->hasPropsToRevert()
#endif // ANDROID
      ;
}

void OperationsLoop::onRender() {
  currentTimestamp_ = getTimestamp_();

  shouldUpdateCssAnimations_ = true;
  if (!hasPendingUpdates()) {
    running_ = false;
    return;
  }

  requestRender_([weakThis = weak_from_this()](double /*timestampMs*/) {
    if (auto strongThis = weakThis.lock()) {
      strongThis->onRender();
    }
  });
}

} // namespace reanimated
