#include <reanimated/Fabric/operations/Operation.h>

namespace reanimated {

void Operation::appendStep(double delay, Step &&step) {
  steps_.emplace_back(delay, std::move(step));
}

void Operation::prependStep(double delay, Step &&step) {
  steps_.emplace_front(delay, std::move(step));
}

OperationBuilder &OperationBuilder::doOnce(std::function<void(double)> op) {
  operation_->appendStep(0.0, [op = std::move(op)](double timestamp) mutable {
    op(timestamp);
    return false;
  });
  return *this;
}

OperationBuilder &OperationBuilder::waitFor(double delaySeconds) {
  operation_->appendStep(delaySeconds, [](double) { return false; });
  return *this;
}

OperationBuilder &OperationBuilder::waitFor(
    std::function<double()> delayProvider) {
  Operation *operationPtr = operation_.get();

  operation_->appendStep(
      0.0,
      [delayProvider = std::move(delayProvider), operationPtr](double) mutable {
        operationPtr->prependStep(
            delayProvider(), [](double) { return false; });
        return false;
      });

  return *this;
}

OperationBuilder &OperationBuilder::doWhile(std::function<bool(double)> op) {
  operation_->appendStep(0.0, std::move(op));
  return *this;
}

std::unique_ptr<Operation> OperationBuilder::build() && {
  return std::move(operation_);
}

} // namespace reanimated
