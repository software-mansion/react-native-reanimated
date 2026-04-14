#pragma once

#include <reanimated/Fabric/updates/LoopOperation.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <worklets/Tools/UIScheduler.h>

#include <functional>
#include <memory>
#include <mutex>
#include <set>
#include <unordered_map>
#include <unordered_set>

namespace reanimated {

class OperationsLoop : public std::enable_shared_from_this<OperationsLoop> {
 public:
  using OperationPtr = std::shared_ptr<LoopOperation>;

  OperationsLoop(
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      const RequestRenderFunction &requestRender,
      const GetAnimationTimestampFunction &getTimestamp);

  double getTimestamp();

  void schedule(OperationPtr operation, double startTimestamp);
  void remove(const OperationPtr &operation);
  bool isEmpty() const;

 private:
  struct DelayedEntry {
    double activateAt;
    OperationPtr operation;

    bool operator<(const DelayedEntry &other) const {
      if (activateAt != other.activateAt) {
        return activateAt < other.activateAt;
      }
      return std::less<OperationPtr>{}(operation, other.operation);
    }
  };

  const std::shared_ptr<worklets::UIScheduler> uiScheduler_;
  const RequestRenderFunction requestRender_;
  const GetAnimationTimestampFunction getTimestamp_;

  bool frameRequested_{false};
  double currentTimestamp_{0};

  mutable std::mutex mutex_;
  std::unordered_set<OperationPtr> activeOps_;
  std::set<DelayedEntry> delayedOps_;
  std::unordered_map<OperationPtr, std::set<DelayedEntry>::iterator> delayedLookup_;

  void update();
  void maybeRequestFrame(bool onUIThread = false);
  void deferTimestampReset();
};

} // namespace reanimated
