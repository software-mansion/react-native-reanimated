#pragma once

#include <reanimated/Fabric/operations/AtomicQueue.h>
#include <reanimated/Fabric/operations/DelayedItemsManager.h>
#include <reanimated/Fabric/operations/Operation.h>

#include <atomic>
#include <functional>
#include <memory>
#include <unordered_map>

namespace reanimated {

using GetAnimationTimestampFunction = std::function<double()>;

class OperationsLoop {
 public:
  explicit OperationsLoop(GetAnimationTimestampFunction getAnimationTimestamp);

  using OperationHandle = uint64_t;

  OperationHandle schedule(std::unique_ptr<ExecutableOperation> operation);
  void remove(OperationHandle handle);
  void update();

 private:
  AtomicQueue<std::pair<OperationHandle, std::unique_ptr<ExecutableOperation>>>
      additionRequests_;
  AtomicQueue<OperationHandle> removalRequests_;
  DelayedItemsManager<OperationHandle, std::unique_ptr<ExecutableOperation>>
      delayedOperations_;
  std::unordered_map<OperationHandle, std::unique_ptr<ExecutableOperation>>
      activeOperations_;

  double timestamp_{0};
  GetAnimationTimestampFunction getTimestamp_;
  std::atomic<OperationHandle> nextHandle_{0};

  void processAdditionRequests();
  void activateDelayedOperations();
  void processRemovalRequests();
  void executeActiveOperations();
};

} // namespace reanimated
