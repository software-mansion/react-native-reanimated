#include <jsi/jsi.h>
#include <worklets/AnimationFrameQueue/AnimationFrameBatchinator.h>
#include <worklets/SharedItems/Serializable.h>

#include <atomic>
#include <functional>
#include <memory>
#include <mutex>
#include <utility>
#include <vector>

namespace worklets {

void AnimationFrameBatchinator::addToBatch(
    const facebook::jsi::Value &callback) {
  {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    callbacks_.push_back(
        std::make_shared<const facebook::jsi::Value>(*uiRuntime_, callback));
  }
  flush();
}

AnimationFrameBatchinator::JsiRequestAnimationFrame
AnimationFrameBatchinator::getJsiRequestAnimationFrame() {
  return [weakThis = weak_from_this()](
             facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback) {
    const auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    strongThis->addToBatch(callback);
  };
}

void AnimationFrameBatchinator::flush() {
  if (flushRequested_.exchange(true)) {
    return;
  }

  requestAnimationFrame_([weakThis = weak_from_this()](double timestampMs) {
    const auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto callbacks = strongThis->pullCallbacks();
    strongThis->flushRequested_ = false;

    auto &uiRuntime = *(strongThis->uiRuntime_);
    for (const auto &callback : callbacks) {
      runOnRuntimeGuarded(uiRuntime, *callback, timestampMs);
    }
  });
}

std::vector<std::shared_ptr<const facebook::jsi::Value>>
AnimationFrameBatchinator::pullCallbacks() {
  std::lock_guard<std::mutex> lock(callbacksMutex_);
  return std::move(callbacks_);
}

AnimationFrameBatchinator::AnimationFrameBatchinator(
    facebook::jsi::Runtime &uiRuntime,
    std::function<void(std::function<void(const double)>)>
        &&forwardedRequestAnimationFrame)
    : uiRuntime_(&uiRuntime),
      requestAnimationFrame_(std::move(forwardedRequestAnimationFrame)) {}

} // namespace worklets
