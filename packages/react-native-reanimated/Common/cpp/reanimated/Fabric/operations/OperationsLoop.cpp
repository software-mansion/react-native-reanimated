#include <reanimated/Fabric/operations/OperationsLoop.h>

namespace reanimated {

OperationsLoop::OperationsLoop(
    const GetAnimationTimestampFunction &getAnimationTimestamp)
    : getTimestamp_(getAnimationTimestamp) {}

OperationsLoop::OperationHandle OperationsLoop::schedule(
    std::unique_ptr<Operation> operation) {
  OperationHandle handle = nextHandle_.fetch_add(1, std::memory_order_relaxed);
  additionRequests_.enqueue({handle, std::move(operation)});
  return handle;
}

void OperationsLoop::remove(OperationHandle handle) {
  removalRequests_.enqueue(handle);
}

void OperationsLoop::processAdditionRequests() {
  auto requests = additionRequests_.dequeueAll();
  for (const auto &[handle, op] : requests) {
    if (!op || op->steps_.empty()) {
      continue;
    }

    double delay = op->steps_.front().first;
    if (delay == 0.0) {
      activeOperations_[handle] = std::move(op);
    } else {
      delayedOperations_.add(timestamp_ + delay, {handle, std::move(op)});
    }
  }
}

void OperationsLoop::activateDelayedOperations() {
  while (!delayedOperations_.empty() &&
         delayedOperations_.top().timestamp <= timestamp_) {
    auto [handle, op] = delayedOperations_.pop();
    activeOperations_[handle] = std::move(op);
  }
}

void OperationsLoop::processRemovalRequests() {
  for (const auto handle : removalRequests_.dequeueAll()) {
    activeOperations_.erase(handle);
    delayedOperations_.remove_if([handle](const OperationPair &scheduledOp) {
      return scheduledOp.first == handle;
    });
  }
}

void OperationsLoop::executeActiveOperations() {
  for (auto it = activeOperations_.begin(); it != activeOperations_.end();) {
    auto &[handle, operation] = *it;

    if (operation->steps_.empty()) {
      it = activeOperations_.erase(it);
      continue;
    }

    auto [delay, step] = std::move(operation->steps_.front());
    operation->steps_.pop_front();

    if (step(timestamp_)) {
      operation->steps_.emplace_front(delay, std::move(step));
    }
    if (operation->steps_.empty()) {
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
