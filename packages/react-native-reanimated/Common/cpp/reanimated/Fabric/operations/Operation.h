#pragma once

#include <deque>
#include <functional>

namespace reanimated {

class OperationsLoop; // Forward declaration

class Operation {
 public:
  using Step = std::function<bool(double timestamp)>;

 private:
  // OperationsLoop needs to access the steps_ private property
  friend class OperationsLoop;
  // OperationBuilder needs to access the addStep private method
  friend class OperationBuilder;

  void addStep(double delay, Step &&step);
  std::deque<std::pair<double, Step>> steps_;
};

class OperationBuilder {
 public:
  OperationBuilder &doOnce(std::function<void(double)> &&op);
  OperationBuilder &waitFor(double delaySeconds);
  OperationBuilder &waitFor(std::function<double()> delayProvider);
  OperationBuilder &doWhile(std::function<bool(double)> &&op);

  operator Operation() && {
    return std::move(operation_);
  }

 private:
  Operation operation_;
};

} // namespace reanimated
