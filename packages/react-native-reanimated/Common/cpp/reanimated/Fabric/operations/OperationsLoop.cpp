#include <reanimated/Fabric/operations/OperationsLoop.h>

namespace reanimated {

OperationsLoop::OperationsLoop(
    GetAnimationTimestampFunction getAnimationTimestamp)
    : getTimestamp_(std::move(getAnimationTimestamp)) {}

double OperationsLoop::getFrameTimestamp() const {
  return timestamp_;
}

OperationsLoop::OperationHandle OperationsLoop::schedule(
    std::unique_ptr<Operation> operation) {
  OperationHandle handle = nextHandle_.fetch_add(1, std::memory_order_relaxed);
  if (operation) {
    additionRequests_.enqueue({handle, std::move(operation)});
  }
  return handle;
}

void OperationsLoop::remove(OperationHandle handle) {
  removalRequests_.enqueue(handle);
}

void OperationsLoop::processAdditionRequests() {
  auto requests = additionRequests_.dequeueAll();
  for (auto &[handle, op] : requests) {
    activeOperations_.emplace(handle, std::move(op));
  }
}

void OperationsLoop::activateDelayedOperations() {
  while (!delayedOperations_.empty() &&
         delayedOperations_.top().timestamp <= timestamp_) {
    auto item = delayedOperations_.pop();
    activeOperations_[item.id] = std::move(item.value);
  }
}

void OperationsLoop::processRemovalRequests() {
  for (const auto handle : removalRequests_.dequeueAll()) {
    activeOperations_.erase(handle);
    delayedOperations_.remove(handle);
  }
}

void OperationsLoop::executeActiveOperations() {
  for (auto it = activeOperations_.begin(); it != activeOperations_.end();) {
    auto &[handle, operation] = *it;
    const auto [shouldDeactivate, delay] = operation->update(timestamp_);

    if (delay > 0) {
      delayedOperations_.add(timestamp_ + delay, handle, std::move(operation));
    }

    if (shouldDeactivate) {
      it = activeOperations_.erase(it);
    } else {
      ++it;
    }
  }
}

void OperationsLoop::update() {
  timestamp_ = getTimestamp_();
  processAdditionRequests();
  activateDelayedOperations();
  processRemovalRequests();
  executeActiveOperations();
}

} // namespace reanimated
