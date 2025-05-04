#include <reanimated/Fabric/operations/Operation.h>

namespace reanimated {

// ExecutableOperation

ExecutableOperation::ExecutableOperation(
    std::deque<std::pair<double, Step>> steps)
    : steps_(std::move(steps)) {}

// Operation (builder)

Operation &Operation::doOnce(std::function<void(double)> op) {
  steps_.emplace_back(0, [op = std::move(op)](double timestamp) {
    op(timestamp);
    return false;
  });
  return *this;
}

Operation &Operation::waitFor(double delaySeconds) {
  steps_.emplace_back(delaySeconds, [](double) { return false; });
  return *this;
}

Operation &Operation::waitFor(std::function<double()> delayProvider) {
  steps_.emplace_back(
      0, [this, delayProvider = std::move(delayProvider)](double) {
        steps_.emplace_front(delayProvider(), [](double) { return false; });
        return false;
      });
  return *this;
}

Operation &Operation::doWhile(std::function<bool(double)> op) {
  steps_.emplace_back(0, std::move(op));
  return *this;
}

std::unique_ptr<ExecutableOperation> Operation::build() {
  return std::unique_ptr<ExecutableOperation>(
      new ExecutableOperation(std::move(steps_)));
}

} // namespace reanimated
