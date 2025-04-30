#include <reanimated/Fabric/EventLoop.h>

namespace reanimated {

EventLoop::EventLoop(const GetAnimationTimestampFunction &getAnimationTimestamp)
    : getAnimationTimestamp_(getAnimationTimestamp) {}

double EventLoop::getTimestamp() const {
  return timestamp_;
}

EventLoop::OperationHandle EventLoop::add(Operation &&operation) {
  OperationHandle handle = nextHandle_++;
  operations_[handle] = std::move(operation);
  return handle;
}

void EventLoop::remove(OperationHandle handle) {
  operations_.erase(handle);
}

void EventLoop::update() {
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
