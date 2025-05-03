#pragma once

#include <reanimated/Fabric/operations/Operation.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <queue>
#include <unordered_map>

namespace reanimated {

class OperationsLoop {
 public:
  explicit OperationsLoop(
      const GetAnimationTimestampFunction &getAnimationTimestamp);

  using OperationHandle = uint64_t;

  double getTimestamp() const;

  OperationHandle schedule(Operation &&operation);

  void remove(OperationHandle handle);
  void update();

 private:
  struct ScheduledOperation {
    double executeAt;
    Operation operation;
    OperationHandle handle;

    bool operator>(const ScheduledOperation &other) const {
      return executeAt > other.executeAt;
    }
  };

  std::unordered_map<OperationHandle, Operation> activeOperations_;
  std::priority_queue<
      ScheduledOperation,
      std::vector<ScheduledOperation>,
      std::greater<>>
      scheduledOperations_;

  double timestamp_{0};

  GetAnimationTimestampFunction getAnimationTimestamp_;
  OperationHandle nextHandle_{0};

  void activateScheduledOperations();
};

} // namespace reanimated
