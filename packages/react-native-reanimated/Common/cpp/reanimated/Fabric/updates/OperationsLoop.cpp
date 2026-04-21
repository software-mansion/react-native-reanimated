#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <worklets/Compat/StableApi.h>

#include <utility>

namespace reanimated {

using namespace worklets;

OperationsLoop::OperationsLoop(
    const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
    const RequestRenderFunction &requestRender,
    const GetAnimationTimestampFunction &getTimestamp,
    TickFunction tick)
    : uiScheduler_(uiScheduler), requestRender_(requestRender), getTimestamp_(getTimestamp), tick_(std::move(tick)) {}

double OperationsLoop::getTimestamp() {
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
    strongThis->requestRender_([weakThis](double timestampMs) {
      if (auto strongThis = weakThis.lock()) {
        strongThis->onRender(timestampMs);
      }
    });
  });
}

void OperationsLoop::onRender(double timestampMs) {
  currentTimestamp_ = timestampMs;

  if (!tick_(timestampMs)) {
    running_ = false;
    return;
  }

  requestRender_([weakThis = weak_from_this()](double newTimestampMs) {
    if (auto strongThis = weakThis.lock()) {
      strongThis->onRender(newTimestampMs);
    }
  });
}

} // namespace reanimated
