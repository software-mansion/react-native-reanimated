#pragma once

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <functional>
#include <memory>
#include <unordered_map>
#include <utility>

namespace reanimated {

class OperationsLoop {
 public:
  explicit OperationsLoop(
      const GetAnimationTimestampFunction &getAnimationTimestamp);

  using Operation = std::function<bool(double timestamp)>;
  using OperationHandle = uint64_t;

  double getTimestamp() const;

  OperationHandle schedule(Operation &&operation);

  template <typename... Operations>
  OperationHandle scheduleSequence(Operations &&...operations);

  void remove(OperationHandle handle);
  void update();

 private:
  std::unordered_map<OperationHandle, Operation> operations_;
  double timestamp_{0};

  GetAnimationTimestampFunction getAnimationTimestamp_;
  OperationHandle nextHandle_{0};
};

} // namespace reanimated
