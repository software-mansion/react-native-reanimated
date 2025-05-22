#include <reanimated/Fabric/operations/Operation.h>

namespace reanimated {

// Public operation builder methods

Operation &&Operation::doOnce(std::function<void(double)> callback) && {
  steps_.emplace_back(
      0, [callback = std::move(callback)](double timestamp, Operation &) {
        callback(timestamp);
        return false;
      });
  return std::move(*this);
}

Operation &&Operation::waitFor(double delaySeconds) && {
  steps_.emplace_back(delaySeconds, [](double, Operation &) { return false; });
  return std::move(*this);
}

Operation &&Operation::waitFor(std::function<double(double)> delayProvider) && {
  steps_.emplace_back(
      0,
      [delayProvider = std::move(delayProvider)](
          double timestamp, Operation &op) {
        op.steps_.emplace_front(
            delayProvider(timestamp),
            [](double, Operation &) { return false; });
        return false;
      });
  return std::move(*this);
}

Operation &&Operation::doWhile(std::function<bool(double)> callback) && {
  steps_.emplace_back(
      0, [callback = std::move(callback)](double timestamp, Operation &) {
        return callback(timestamp);
      });
  return std::move(*this);
}

std::unique_ptr<Operation> Operation::build() && {
  return std::make_unique<Operation>(std::move(*this));
}

// Methods used by OperationsLoop only

bool Operation::isEmpty() const {
  return steps_.empty();
}

std::pair<bool, double> Operation::update(const double timestamp) {
  while (!steps_.empty()) {
    auto [delay, step] = std::move(steps_.front());
    steps_.pop_front();

    if (delay > 0) {
      // Reset delay to avoid repeated delay applications
      steps_.emplace_front(0, std::move(step));
      return {true, delay};
    }

    const bool shouldRepeat = step(timestamp, *this);
    if (shouldRepeat) {
      // If the step needs repetition, re-add it immediately for the next update
      // cycle.
      steps_.emplace_front(0, std::move(step));
      return {false, 0}; // Don't deactivate or delay the step if should repeat
    }
  }

  // No more steps to execute; operation is complete.
  return {true, 0}; // Deactivate the operation
}

} // namespace reanimated
