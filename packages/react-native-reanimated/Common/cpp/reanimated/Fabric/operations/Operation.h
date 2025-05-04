#pragma once

#include <deque>
#include <functional>
#include <memory>

namespace reanimated {

class ExecutableOperation {
 public:
  using Step = std::function<bool(double)>;

 private:
  friend class Operation;
  friend class OperationsLoop;

  explicit ExecutableOperation(std::deque<std::pair<double, Step>> steps);

  std::deque<std::pair<double, Step>> steps_;
};

class Operation {
 public:
  using Step = std::function<bool(double)>;

  Operation &doOnce(std::function<void(double)> op);
  Operation &waitFor(double delaySeconds);
  Operation &waitFor(std::function<double()> delayProvider);
  Operation &doWhile(std::function<bool(double)> op);

  std::unique_ptr<ExecutableOperation> build();

 private:
  std::deque<std::pair<double, Step>> steps_;
};

} // namespace reanimated
