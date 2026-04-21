#pragma once

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <worklets/Tools/UIScheduler.h>

#include <functional>
#include <memory>

namespace reanimated {

class OperationsLoop : public std::enable_shared_from_this<OperationsLoop> {
 public:
  // Returns true if the loop should keep running on the next frame.
  using TickFunction = std::function<bool(double)>;

  OperationsLoop(
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      const RequestRenderFunction &requestRender,
      const GetAnimationTimestampFunction &getTimestamp,
      TickFunction tick);

  // Returns the cached frame timestamp while the loop is running; otherwise fetches a fresh one.
  double getTimestamp();

  // Starts the loop if it's not already running.
  void run();

  bool isRunning() const {
    return running_;
  }

 private:
  const std::shared_ptr<worklets::UIScheduler> uiScheduler_;
  const RequestRenderFunction requestRender_;
  const GetAnimationTimestampFunction getTimestamp_;
  const TickFunction tick_;

  bool running_{false};
  double currentTimestamp_{0};

  void onRender(double timestampMs);
};

} // namespace reanimated
