#pragma once

#include <reanimated/Fabric/updates/LoopOperation.h>
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

namespace reanimated::css {
class CSSAnimationsRegistry;
class CSSTransitionsRegistry;
} // namespace reanimated::css

namespace reanimated {

class UpdatesRegistryManager;

class OperationsLoop : public std::enable_shared_from_this<OperationsLoop> {
 public:
  OperationsLoop(
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      const RequestRenderFunction &requestRender,
      const GetAnimationTimestampFunction &getTimestamp,
      const std::shared_ptr<css::CSSAnimationsRegistry> &cssAnimationsRegistry,
      const std::shared_ptr<css::CSSTransitionsRegistry> &cssTransitionsRegistry,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager);

  // Returns the cached frame timestamp while the loop is running; otherwise fetches a fresh one.
  double resolveTimestamp();

  // Starts the loop if it's not already running.
  void run();

  [[nodiscard]]
  bool isRunning() const {
    return running_;
  }

  [[nodiscard]]
  bool shouldUpdateCssAnimations() const {
    return shouldUpdateCssAnimations_;
  }

  void clearShouldUpdateCssAnimations();

  // Operation-based scheduling. Not yet wired to anything - introduced here so
  // the migration of CSSTransition / CSSAnimation in a follow-up PR can move
  // them onto this API without re-touching the loop's structure.
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
  const std::shared_ptr<css::CSSAnimationsRegistry> cssAnimationsRegistry_;
  const std::shared_ptr<css::CSSTransitionsRegistry> cssTransitionsRegistry_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;

  bool running_{false};
  double currentTimestamp_{0};
  bool shouldUpdateCssAnimations_{true};

  // Operation-based machinery (dormant in this PR).
  mutable std::mutex queueMutex_;
  std::vector<ScheduledOperation> scheduledOperations_;
  std::atomic<bool> frameRequested_{false};
  std::unordered_set<std::shared_ptr<LoopOperation>> activeOps_;
  std::set<DelayedEntry> delayedOps_;
  std::unordered_map<std::shared_ptr<LoopOperation>, std::set<DelayedEntry>::iterator> delayedLookup_;

  void onRender();
  bool hasPendingUpdates() const;

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
