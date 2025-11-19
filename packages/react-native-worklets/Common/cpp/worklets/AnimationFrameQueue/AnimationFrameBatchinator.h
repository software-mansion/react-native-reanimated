#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <atomic>
#include <functional>
#include <memory>
#include <mutex>
#include <vector>

namespace worklets {

class AnimationFrameBatchinator : public std::enable_shared_from_this<AnimationFrameBatchinator> {
 public:
  using JsiRequestAnimationFrame = std::function<void(jsi::Runtime &, const jsi::Value &)>;

  void addToBatch(jsi::Function &&callback);
  JsiRequestAnimationFrame getJsiRequestAnimationFrame();

  AnimationFrameBatchinator(
      const std::shared_ptr<WorkletRuntime> &uiWorkletRuntime,
      RuntimeBindings::RequestAnimationFrame requestAnimationFrame);

 private:
  void flush();
  std::vector<std::shared_ptr<const jsi::Function>> pullCallbacks();

  std::vector<std::shared_ptr<const jsi::Function>> callbacks_{};
  std::mutex callbacksMutex_{};
  std::atomic_bool flushRequested_{};
  std::shared_ptr<WorkletRuntime> uiWorkletRuntime_;
  std::function<void(std::function<void(const double)>)> requestAnimationFrame_;
};

} // namespace worklets
