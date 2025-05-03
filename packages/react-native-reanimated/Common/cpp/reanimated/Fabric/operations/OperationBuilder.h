#pragma once

#include <deque>
#include <functional>
#include <memory>

namespace reanimated {

class OperationsLoop;

class Operation {
 public:
  using Step = std::function<bool(double timestamp)>;

  bool isCompleted() const noexcept {
    return steps_.empty();
  }

 private:
  friend class OperationsLoop;
  friend class OperationBuilder;

  void appendStep(double delay, Step &&step) noexcept;
  void prependStep(double delay, Step &&step) noexcept;

  std::deque<std::pair<double, Step>> steps_;
};

class OperationBuilder {
 public:
  OperationBuilder() noexcept = default;
  OperationBuilder(OperationBuilder &&) noexcept = default;
  OperationBuilder &operator=(OperationBuilder &&) noexcept = default;

  OperationBuilder(const OperationBuilder &) = delete;
  OperationBuilder &operator=(const OperationBuilder &) = delete;

  OperationBuilder &&doOnce(std::function<void(double)> op) &&;
  OperationBuilder &&waitFor(double delaySeconds) &&;
  OperationBuilder &&waitFor(std::function<double()> delayProvider) &&;
  OperationBuilder &&doWhile(std::function<bool(double)> op) &&;

  std::unique_ptr<Operation> build() && noexcept;

 private:
  std::unique_ptr<Operation> operation_{std::make_unique<Operation>()};
};

} // namespace reanimated
