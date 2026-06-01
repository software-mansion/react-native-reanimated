#pragma once

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <worklets/Compat/StableApi.h>

#include <atomic>
#include <memory>
#include <mutex>
#include <optional>
#include <set>
#include <tuple>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

class UpdatesRegistryManager;

class OperationsLoop : public std::enable_shared_from_this<OperationsLoop> {
 public:
  class LoopOperation {
   public:
    virtual ~LoopOperation() = default;
    virtual bool update(double timestamp, OperationsLoop &loop) = 0;
  };

  OperationsLoop(
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      const RequestRenderFunction &requestRender,
      const GetAnimationTimestampFunction &getTimestamp,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager);

  double resolveTimestamp();

  // True if anything is queued, active, or delayed in the loop.
  bool hasOngoingOperations() const;

  void schedule(std::shared_ptr<LoopOperation> operation, double startTimestamp);
  void remove(const std::shared_ptr<LoopOperation> &operation);

 private:
  struct ScheduledOperation {
    std::shared_ptr<LoopOperation> operation;
    std::optional<double> insertAt; // nullopt means remove
  };

  struct DelayedEntry {
    double activateAt;
    std::shared_ptr<LoopOperation> operation;

    bool operator<(const DelayedEntry &other) const {
      return std::tie(activateAt, operation) < std::tie(other.activateAt, other.operation);
    }
  };

  const std::shared_ptr<worklets::UIScheduler> uiScheduler_;
  const RequestRenderFunction requestRender_;
  const GetAnimationTimestampFunction getTimestamp_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;

  mutable std::mutex queueMutex_;
  std::vector<ScheduledOperation> scheduledOperations_;

  std::atomic<bool> frameRequested_{false};
  std::atomic<double> currentTimestamp_{0};

  std::unordered_set<std::shared_ptr<LoopOperation>> activeOps_;
  std::set<DelayedEntry> delayedOps_;
  std::unordered_map<std::shared_ptr<LoopOperation>, std::set<DelayedEntry>::iterator> delayedLookup_;

  void update();
  void enqueue(ScheduledOperation operation);

  void maybeScheduleFrame();

  std::pair<std::vector<ScheduledOperation>, double> beginFrame();
  void endFrame();
  void applyScheduledOperations(std::vector<ScheduledOperation> operations, double timestamp);
  void activateDelayedOperations(double timestamp);
  void updateActiveOperations(double timestamp);
};

} // namespace reanimated
