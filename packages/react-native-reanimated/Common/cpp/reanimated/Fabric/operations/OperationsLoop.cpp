#include <reanimated/Fabric/operations/OperationsLoop.h>

namespace reanimated {

OperationsLoop::OperationsLoop(
    const GetAnimationTimestampFunction &getAnimationTimestamp)
    : getAnimationTimestamp_(getAnimationTimestamp) {}

double OperationsLoop::getTimestamp() const {
  return timestamp_;
}

OperationsLoop::OperationHandle OperationsLoop::schedule(
    Operation &&operation) {
  OperationHandle handle = nextHandle_++;
  scheduledOperations_.push({timestamp_, std::move(operation), handle});
  return handle;
}

void OperationsLoop::remove(OperationHandle handle) {
  activeOperations_.erase(handle);
}

void OperationsLoop::activateScheduledOperations() {
  while (!scheduledOperations_.empty() &&
         scheduledOperations_.top().executeAt <= timestamp_) {
    auto scheduledOp = std::move(scheduledOperations_.top());
    activeOperations_[scheduledOp.handle] = std::move(scheduledOp.operation);
    scheduledOperations_.pop();
  }
}

void OperationsLoop::update() {
  timestamp_ = getAnimationTimestamp_();

  activateScheduledOperations();

  auto activeOperationsCopy = activeOperations_;
  for (auto &[handle, operation] : activeOperationsCopy) {
    if (operation.steps_.empty()) {
      activeOperations_.erase(handle);
      continue;
    }

    auto &[delay, step] = operation.steps_.front();
    if (delay > 0) {
      scheduledOperations_.push(
          {timestamp_ + delay, std::move(operation), handle});
      activeOperations_.erase(handle);
    } else if (!step(timestamp_)) {
      operation.steps_.pop_front();
    }
  }
}

} // namespace reanimated
