#include <reanimated/Fabric/operations/OperationBuilder.h>

namespace reanimated {

// Operation

void Operation::appendStep(double delay, Step &&step) noexcept {
  steps_.emplace_back(delay, std::move(step));
}

void Operation::prependStep(double delay, Step &&step) noexcept {
  steps_.emplace_front(delay, std::move(step));
}

// OperationBuilder

OperationBuilder &&OperationBuilder::doOnce(std::function<void(double)> op) && {
  operation_->appendStep(0.0, [op = std::move(op)](double timestamp) mutable {
    op(timestamp);
    return false;
  });
  return std::move(*this);
}

OperationBuilder &&OperationBuilder::waitFor(double delaySeconds) && {
  operation_->appendStep(delaySeconds, [](double) { return false; });
  return std::move(*this);
}

OperationBuilder &&OperationBuilder::waitFor(
    std::function<double()> delayProvider) && {
  Operation *operationPtr = operation_.get();

  operation_->appendStep(
      0.0,
      [delayProvider = std::move(delayProvider), operationPtr](double) mutable {
        operationPtr->prependStep(
            delayProvider(), [](double) { return false; });
        return false;
      });

  return std::move(*this);
}

OperationBuilder &&OperationBuilder::doWhile(
    std::function<bool(double)> op) && {
  operation_->appendStep(0.0, std::move(op));
  return std::move(*this);
}

std::unique_ptr<Operation> OperationBuilder::build() && noexcept {
  return std::move(operation_);
}

} // namespace reanimated
