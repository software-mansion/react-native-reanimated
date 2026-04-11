#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <utility>

namespace reanimated {

OperationsLoop::OperationsLoop(
    const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
    const RequestRenderFunction &requestRender,
    const GetAnimationTimestampFunction &getTimestamp)
    : uiScheduler_(uiScheduler), requestRender_(requestRender), getTimestamp_(getTimestamp) {}

double OperationsLoop::getTimestamp() {
  if (currentTimestamp_ <= 0) {
    // Cache the timestamp so all callers within the same frame window
    // get a consistent value.
    currentTimestamp_ = getTimestamp_();
    // Schedule a frame to reset the cache,
    // preventing it from going stale if no operations are scheduled.
    deferTimestampReset();
  }
  return currentTimestamp_;
}

void OperationsLoop::schedule(OperationPtr operation, double delay) {
  std::lock_guard<std::mutex> lock(mutex_);

  // Remove existing entry first to avoid duplicates
  activeOps_.erase(operation);
  auto lookupIt = delayedLookup_.find(operation);
  if (lookupIt != delayedLookup_.end()) {
    delayedOps_.erase(lookupIt->second);
    delayedLookup_.erase(lookupIt);
  }

  if (delay <= 0) {
    activeOps_.insert(std::move(operation));
  } else {
    const auto activateAt = getTimestamp() + delay;
    auto it = delayedOps_.insert({activateAt, operation}).first;
    delayedLookup_[operation] = it;
  }

  maybeRequestFrame();
}

void OperationsLoop::remove(const OperationPtr &operation) {
  std::lock_guard<std::mutex> lock(mutex_);

  activeOps_.erase(operation);

  auto lookupIt = delayedLookup_.find(operation);
  if (lookupIt != delayedLookup_.end()) {
    delayedOps_.erase(lookupIt->second);
    delayedLookup_.erase(lookupIt);
  }
}

bool OperationsLoop::isEmpty() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return activeOps_.empty() && delayedOps_.empty();
}

void OperationsLoop::update() {
  std::lock_guard<std::mutex> lock(mutex_);

  frameRequested_ = false;
  currentTimestamp_ = getTimestamp_();

  // Promote delayed operations whose start time has arrived
  while (!delayedOps_.empty()) {
    auto it = delayedOps_.begin();
    if (it->activateAt > currentTimestamp_) {
      break;
    }
    activeOps_.insert(it->operation);
    delayedLookup_.erase(it->operation);
    delayedOps_.erase(it);
  }

  // Update all active operations and remove non-running ones
  for (auto it = activeOps_.begin(); it != activeOps_.end();) {
    (*it)->update(currentTimestamp_);

    if ((*it)->isRunning()) {
      ++it;
    } else {
      it = activeOps_.erase(it);
    }
  }

  // Invalidate cached timestamp — next getTimestamp() call fetches fresh
  currentTimestamp_ = 0;

  maybeRequestFrame(true);
}

void OperationsLoop::maybeRequestFrame(bool onUIThread) {
  if (frameRequested_ || (activeOps_.empty() && delayedOps_.empty())) {
    return;
  }

  frameRequested_ = true;

  auto renderCallback = [weakThis = weak_from_this()](double /*frameTimestamp*/) {
    if (auto strongThis = weakThis.lock()) {
      strongThis->update();
    }
  };

  if (onUIThread) {
    requestRender_(std::move(renderCallback));
  } else {
    uiScheduler_->scheduleOnUI([requestRender = requestRender_, renderCallback = std::move(renderCallback)]() {
      requestRender(std::move(renderCallback));
    });
  }
}

void OperationsLoop::deferTimestampReset() {
  if (frameRequested_ || !activeOps_.empty() || !delayedOps_.empty()) {
    return;
  }

  frameRequested_ = true;
  uiScheduler_->scheduleOnUI([requestRender = requestRender_, weakThis = weak_from_this()]() {
    requestRender([weakThis](double /*frameTimestamp*/) {
      if (auto strongThis = weakThis.lock()) {
        strongThis->update();
      }
    });
  });
}

} // namespace reanimated
