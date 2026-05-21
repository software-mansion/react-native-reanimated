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

void OperationsLoop::schedule(std::shared_ptr<LoopOperation> operation, double startTimestamp) {
  enqueue({std::move(operation), startTimestamp});
}

void OperationsLoop::remove(const std::shared_ptr<LoopOperation> &operation) {
  enqueue({operation, std::nullopt});
}

void OperationsLoop::enqueue(ScheduledOperation operation) {
  {
    const std::lock_guard<std::mutex> lock(queueMutex_);
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

void OperationsLoop::update() {
  auto [operations, timestamp] = beginFrame();
  applyScheduledOperations(std::move(operations), timestamp);
  activateDelayedOperations(timestamp);
  updateActiveOperations(timestamp);
  endFrame();
}

std::pair<std::vector<OperationsLoop::ScheduledOperation>, double> OperationsLoop::beginFrame() {
  const double freshTimestamp = getTimestamp_();

  std::vector<ScheduledOperation> drained;
  {
    // Reset frameRequested_ together with the drain so an enqueue() can't slip a push
    // in between (which would see the flag still true and skip scheduling).
    const std::lock_guard<std::mutex> lock(queueMutex_);
    drained = std::exchange(scheduledOperations_, {});
    frameRequested_.store(false, std::memory_order_release);
  }

  return {std::move(drained), freshTimestamp};
}

void OperationsLoop::endFrame() {
  // activeOps_ / delayedOps_ are touched only on the UI thread, so we can read them lock-free.
  // We don't check the scheduledOperations_ queue: enqueue() schedules its own frame, so any
  // pushes that arrived during update() have already requested a frame on their own.
  if (!activeOps_.empty() || !delayedOps_.empty()) {
    maybeScheduleFrame();
  }
}

void OperationsLoop::applyScheduledOperations(std::vector<ScheduledOperation> operations, double timestamp) {
  for (auto &op : operations) {
    // Remove from prior placement. delayedLookup_ tells us where: if it's
    // there, the op is delayed and we extract the tree node (so we can reuse
    // it below); otherwise we just erase it from the active operations set.
    std::set<DelayedEntry>::node_type node;
    if (auto it = delayedLookup_.find(op.operation); it != delayedLookup_.end()) {
      node = delayedOps_.extract(it->second);
      delayedLookup_.erase(it);
    } else {
      activeOps_.erase(op.operation);
    }

    // Skip if the operation is scheduled for removal.
    if (op.insertAt == std::nullopt) {
      continue;
    }

    const double insertAt = op.insertAt.value();
    if (insertAt <= timestamp) {
      activeOps_.insert(std::move(op.operation));
    } else if (node) {
      // Reuse the extracted node
      node.value().activateAt = insertAt;
      auto it = delayedOps_.insert(std::move(node)).position;
      delayedLookup_.emplace(std::move(op.operation), it);
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
  std::erase_if(activeOps_, [&](auto &op) { return !op->update(timestamp); });
}

} // namespace reanimated
