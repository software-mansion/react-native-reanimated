#include <reanimated/Fabric/operations/Operation.h>

namespace reanimated {

void Operation::addStep(const double delay, Step &&step) {
  steps_.emplace_back(delay, std::move(step));
}

OperationBuilder &OperationBuilder::doOnce(std::function<void(double)> &&op) {
  operation_.addStep(0.0, [op = std::move(op)](double timestamp) mutable {
    op(timestamp);
    return false;
  });
  return *this;
}

OperationBuilder &OperationBuilder::waitFor(const double delaySeconds) {
  operation_.addStep(delaySeconds, [](double) { return false; });
  return *this;
}

OperationBuilder &OperationBuilder::waitFor(
    std::function<double()> delayProvider) {
  return waitFor(delayProvider());
}

OperationBuilder &OperationBuilder::doWhile(std::function<bool(double)> &&op) {
  operation_.addStep(0.0, std::move(op));
  return *this;
}

} // namespace reanimated
