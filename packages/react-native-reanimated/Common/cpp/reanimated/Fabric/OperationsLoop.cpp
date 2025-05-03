#include <reanimated/Fabric/OperationsLoop.h>

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
  operations_[handle] = std::move(operation);
  return handle;
}

template <typename... Operations>
OperationsLoop::OperationHandle OperationsLoop::scheduleSequence(
    Operations &&...operations) {
  auto sequenceQueue = std::make_shared<std::deque<Operation>>();
  (sequenceQueue->emplace_back(std::forward<Operations>(operations)), ...);

  Operation sequenceOperation =
      [sequenceQueue](double timestamp) mutable -> bool {
    while (!sequenceQueue->empty()) {
      auto &currentOp = sequenceQueue->front();
      if (!currentOp(timestamp)) {
        sequenceQueue->pop_front();
      } else {
        break;
      }
    }
    return !sequenceQueue->empty();
  };

  return schedule(std::move(sequenceOperation));
}

void OperationsLoop::remove(OperationHandle handle) {
  operations_.erase(handle);
}

void OperationsLoop::update() {
  timestamp_ = getAnimationTimestamp_();

  // Create a copy of the operations map
  auto operationsCopy = operations_;

  // Iterate over the copy and update the original map
  for (const auto &[handle, operation] : operationsCopy) {
    if (!operation(timestamp_)) {
      operations_.erase(handle);
    }
  }
}

} // namespace reanimated
