#include <reanimated/Fabric/updates/OperationsLoop.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <utility>

namespace reanimated {

OperationsLoop::OperationsLoop(
    const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
    const RequestRenderFunction &requestRender,
    const GetAnimationTimestampFunction &getTimestamp,
    const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager)
    : uiScheduler_(uiScheduler),
      requestRender_(requestRender),
      getTimestamp_(getTimestamp),
      updatesRegistryManager_(updatesRegistryManager) {}

double OperationsLoop::resolveTimestamp() {
  // Fast path: cache hit is lock-free.
  if (const double cached = currentTimestamp_.load(std::memory_order_acquire); cached > 0) {
    return cached;
  }

  // Slow path: try to win the cache fill. If someone else already filled it, use theirs.
  const double fresh = getTimestamp_();
  double expected = 0;
  if (!currentTimestamp_.compare_exchange_strong(expected, fresh, std::memory_order_acq_rel)) {
    return expected;
  }

  // We filled the cache - make sure a frame is scheduled to invalidate it.
  maybeScheduleFrame();
  return fresh;
}

bool OperationsLoop::hasOngoingOperations() const {
  std::lock_guard<std::mutex> lock(queueMutex_);
  return !scheduledOperations_.empty() || !activeOps_.empty() || !delayedOps_.empty();
}

void OperationsLoop::schedule(std::shared_ptr<LoopOperation> operation, double startTimestamp) {
  enqueue({std::move(operation), startTimestamp});
}

void OperationsLoop::remove(const std::shared_ptr<LoopOperation> &operation) {
  enqueue({operation, std::nullopt});
}

void OperationsLoop::update() {
  auto [operations, timestamp] = beginFrame();
  applyScheduledOperations(std::move(operations), timestamp);
  activateDelayedOperations(timestamp);
  updateActiveOperations(timestamp);
  endFrame();
}

void OperationsLoop::enqueue(ScheduledOperation operation) {
  {
    std::lock_guard<std::mutex> lock(queueMutex_);
    scheduledOperations_.emplace_back(std::move(operation));
  }

  maybeScheduleFrame();
}

void OperationsLoop::maybeScheduleFrame() {
  // No-op if a frame is already scheduled - flips the flag and returns true if so.
  if (frameRequested_.exchange(true, std::memory_order_acq_rel)) {
    return;
  }

  worklets::scheduleOnUI(uiScheduler_, [weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }
    strongThis->requestRender_([weakThis](double /*frameTimestamp*/) {
      if (auto strongThis = weakThis.lock()) {
        strongThis->update();
      }
    });
  });
}

std::pair<std::vector<OperationsLoop::ScheduledOperation>, double> OperationsLoop::beginFrame() {
  const double freshTimestamp = getTimestamp_();

  std::vector<ScheduledOperation> drained;
  {
    // Reset frameRequested_ together with the drain so an enqueue() can't slip a push
    // in between (which would see the flag still true and skip scheduling).
    std::lock_guard<std::mutex> lock(queueMutex_);
    drained = std::exchange(scheduledOperations_, {});
    frameRequested_.store(false, std::memory_order_release);
  }

  currentTimestamp_.store(freshTimestamp, std::memory_order_release);

  return {std::move(drained), freshTimestamp};
}

void OperationsLoop::endFrame() {
  // activeOps_ / delayedOps_ are touched only on the UI thread, so we can read them lock-free.
  // We don't check the scheduledOperations_ queue: enqueue() schedules its own frame, so any
  // pushes that arrived during update() have already requested a frame on their own.
  const bool hasOngoingOperations = !activeOps_.empty() || !delayedOps_.empty();

  currentTimestamp_.store(0, std::memory_order_release);

  if (hasOngoingOperations) {
    maybeScheduleFrame();
  }
}

void OperationsLoop::applyScheduledOperations(std::vector<ScheduledOperation> operations, double timestamp) {
  for (auto &op : operations) {
    // Remove any prior scheduling for this operation.
    activeOps_.erase(op.operation);
    if (auto it = delayedLookup_.find(op.operation); it != delayedLookup_.end()) {
      delayedOps_.erase(it->second);
      delayedLookup_.erase(it);
    }

    if (!op.insertAt) {
      continue;
    }

    const double insertAt = *op.insertAt;
    if (insertAt <= timestamp) {
      activeOps_.insert(std::move(op.operation));
    } else {
      auto it = delayedOps_.insert({insertAt, op.operation}).first;
      delayedLookup_.emplace(std::move(op.operation), it);
    }
  }
}

void OperationsLoop::activateDelayedOperations(double timestamp) {
  while (!delayedOps_.empty() && delayedOps_.begin()->activateAt <= timestamp) {
    auto it = delayedOps_.begin();
    delayedLookup_.erase(it->operation);
    activeOps_.insert(it->operation);
    delayedOps_.erase(it);
  }
}

void OperationsLoop::updateActiveOperations(double timestamp) {
  auto lock = updatesRegistryManager_->lock();
  std::erase_if(activeOps_, [&](auto &op) { return !op->update(timestamp, *this); });
}

} // namespace reanimated
