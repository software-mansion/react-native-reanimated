#pragma once

#include <deque>
#include <functional>
#include <memory>

namespace reanimated {

class OperationsLoop;

class Operation {
 public:
  using Step = std::function<bool(double timestamp)>;

  bool isCompleted() const {
    return steps_.empty();
  }

 private:
  // OperationsLoop needs to access the steps_ private property
  friend class OperationsLoop;
  // OperationBuilder needs to access the addStep private method
  friend class OperationBuilder;

  void appendStep(double delay, Step &&step);
  void prependStep(double delay, Step &&step);

  std::deque<std::pair<double, Step>> steps_;
};

class OperationBuilder {
 public:
  OperationBuilder &doOnce(std::function<void(double)> op);
  OperationBuilder &waitFor(double delaySeconds);
  OperationBuilder &waitFor(std::function<double()> delayProvider);
  OperationBuilder &doWhile(std::function<bool(double)> op);

  std::unique_ptr<Operation> build() &&;

 private:
  std::unique_ptr<Operation> operation_{std::make_unique<Operation>()};
};

} // namespace reanimated
