#include <glog/logging.h>
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
  LOG(INFO) << "[5] remove: " << handle;
  removalRequests_.enqueue(handle);
}

void OperationsLoop::processAdditionRequests() {
  auto requests = additionRequests_.dequeueAll();
  for (auto &[handle, op] : requests) {
    if (!op || op->steps_.empty()) {
      continue;
    }
    activeOperations_.emplace(handle, std::move(op));
  }
}

void OperationsLoop::activateDelayedOperations() {
  while (!delayedOperations_.empty() &&
         delayedOperations_.top().timestamp <= timestamp_) {
    auto item = delayedOperations_.pop();
    if (item.value && !item.value->steps_.empty()) {
      item.value->steps_.front().first = 0.0;
      activeOperations_[item.id] = std::move(item.value);
    }
  }
}

void OperationsLoop::processRemovalRequests() {
  for (const auto handle : removalRequests_.dequeueAll()) {
    LOG(INFO) << "[6] processRemovalRequests: " << handle;
    activeOperations_.erase(handle);
    delayedOperations_.remove(handle);
  }
}

void OperationsLoop::executeActiveOperations() {
  for (auto it = activeOperations_.begin(); it != activeOperations_.end();) {
    auto &[handle, operation] = *it;
    bool shouldDeactivate = !operation || operation->steps_.empty();

    while (!shouldDeactivate) {
      auto &[delay, step] = operation->steps_.front();

      if (delay > 0.0) {
        delayedOperations_.add(
            timestamp_ + delay, handle, std::move(operation));
        shouldDeactivate = true;
        break; // exit loop immediately if operation is delayed
      }

      // Extract step safely (move out first)
      auto currentStep = std::move(step);
      operation->steps_.pop_front();

      bool shouldRepeat = currentStep(timestamp_);

      if (shouldRepeat) {
        operation->steps_.emplace_front(0.0, std::move(currentStep));
        break; // stop executing more steps in this update call
      }

      if (operation->steps_.empty()) {
        shouldDeactivate = true;
      }
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
