#pragma once

#include <jsi/jsi.h>
#include <worklets/RunLoop/EventLoop.h>

#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

using namespace facebook;

namespace worklets {

class VSyncEventLoop : public EventLoop {
 public:
  using FrameRequester = std::function<void(std::function<void(double timestampMs)> &&onFrame)>;

  VSyncEventLoop(
      const std::string &name,
      AbortToken abortToken,
      const std::shared_ptr<jsi::Runtime> &runtime,
      const std::shared_ptr<AsyncQueue> &queue,
      const std::shared_ptr<std::recursive_mutex> &runtimeMutex,
      const std::shared_ptr<RuntimeTaskState> &taskState,
      FrameRequester &&requestFrame);

  void runOnNextFrame(std::function<void(jsi::Runtime &rt, double timestampMs)> &&job);

 protected:
  void releaseDueTimeouts(std::vector<Timeout> &&dueTimeouts) override;

 private:
  const FrameRequester requestFrame_;
  std::mutex frameTimeoutsMutex_;
  std::vector<std::function<void(jsi::Runtime &rt)>> frameTimeouts_;
  bool frameRequested_ = false;

  void runFrameTimeouts();
  std::weak_ptr<VSyncEventLoop> weakSelf();
};

} // namespace worklets
