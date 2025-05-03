#pragma once

#include <deque>
#include <functional>

namespace reanimated {

class Operation {
 public:
  using Step = std::function<bool(double timestamp)>;

  void addStep(double delay, Step &&step);

 private:
  std::deque<std::pair<double, Step>> steps_;
};

class OperationBuilder {
 public:
  operator Operation() && {
    return std::move(operation_);
  }

  OperationBuilder &doOnce(std::function<void(double)> &&op);
  OperationBuilder &waitFor(double delaySeconds);
  OperationBuilder &waitFor(std::function<double()> delayProvider);
  OperationBuilder &doWhile(std::function<bool(double)> &&op);

 private:
  Operation operation_;
};

} // namespace reanimated
