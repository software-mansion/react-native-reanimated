#include <reanimated/Fabric/EventLoop.h>

namespace reanimated {

EventLoop::OperationHandle EventLoop::add(Operation operation) {
  OperationHandle handle = nextHandle_++;
  operations_[handle] = std::move(operation);
  return handle;
}

void EventLoop::remove(OperationHandle handle) {
  operations_.erase(handle);
}

void EventLoop::update(double timestamp) {
  // Create a copy of the operations map
  auto operationsCopy = operations_;

  // Iterate over the copy and update the original map
  for (const auto &[handle, operation] : operationsCopy) {
    if (!operation(timestamp)) {
      operations_.erase(handle);
    }
  }
}

} // namespace reanimated
