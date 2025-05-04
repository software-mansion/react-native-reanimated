#pragma once

#include <deque>
#include <functional>
#include <memory>
#include <utility>

namespace reanimated {

class OperationsLoop; // forward declaration

class Operation {
 public:
  Operation() = default;

  // Don't allow copying
  Operation(const Operation &) = delete;
  Operation &operator=(const Operation &) = delete;

  Operation(Operation &&) = default;
  Operation &operator=(Operation &&) = default;

  Operation &&doOnce(std::function<void(double)> callback) &&;
  Operation &&waitFor(double delaySeconds) &&;
  Operation &&waitFor(std::function<double(double)> delayProvider) &&;
  Operation &&doWhile(std::function<bool(double)> callback) &&;

  // Build method returns a unique_ptr<Operation>
  std::unique_ptr<Operation> build() &&;

 private:
  using Step = std::function<bool(double, Operation &)>;

  friend class OperationsLoop;

  bool isEmpty() const;
  std::pair<bool, double> update(double timestamp);

  std::deque<std::pair<double, Step>> steps_;
};

} // namespace reanimated
