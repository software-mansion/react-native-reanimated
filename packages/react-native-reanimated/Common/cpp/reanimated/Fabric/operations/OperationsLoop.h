#pragma once

#include <reanimated/Fabric/operations/AtomicQueue.h>
#include <reanimated/Fabric/operations/DelayedItemsManager.h>
#include <reanimated/Fabric/operations/Operation.h>

#include <atomic>
#include <memory>
#include <unordered_map>

namespace reanimated {

using GetAnimationTimestampFunction = std::function<double()>;

class OperationsLoop {
 public:
  explicit OperationsLoop(
      const GetAnimationTimestampFunction &getAnimationTimestamp);

  using OperationHandle = uint64_t;

  OperationHandle schedule(std::unique_ptr<Operation> operation);
  void remove(OperationHandle handle);
  void update();

 private:
  using OperationPair = std::pair<OperationHandle, std::unique_ptr<Operation>>;
  using OperationsMap =
      std::unordered_map<OperationHandle, std::unique_ptr<Operation>>;

  AtomicQueue<OperationPair> additionRequests_;
  AtomicQueue<OperationHandle> removalRequests_;
  DelayedItemsManager<OperationPair> delayedOperations_;
  OperationsMap activeOperations_;

  double timestamp_{0};
  GetAnimationTimestampFunction getTimestamp_;
  std::atomic<OperationHandle> nextHandle_{0};

  void processAdditionRequests();
  void activateDelayedOperations();
  void processRemovalRequests();
  void executeActiveOperations();
};

} // namespace reanimated
