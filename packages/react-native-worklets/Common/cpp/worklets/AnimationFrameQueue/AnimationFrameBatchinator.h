#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Shareables.h>
#include <atomic>
#include <functional>
#include <memory>
#include <mutex>
#include <vector>

namespace worklets {

class AnimationFrameBatchinator
    : public std::enable_shared_from_this<AnimationFrameBatchinator> {
 public:
  using JsiRequestAnimationFrame = std::function<
      void(facebook::jsi::Runtime &, const facebook::jsi::Value &)>;

  void addToBatch(const facebook::jsi::Value &callback);
  JsiRequestAnimationFrame getJsiRequestAnimationFrame();

  AnimationFrameBatchinator(
      facebook::jsi::Runtime &uiRuntime,
      std::function<void(std::function<void(const double)>)>
          &&forwardedRequestAnimationFrame);

 private:
  void flush();
  std::vector<std::shared_ptr<const facebook::jsi::Value>> pullCallbacks();

  std::vector<std::shared_ptr<const facebook::jsi::Value>> callbacks_{};
  std::mutex callbacksMutex_{};
  std::atomic_bool flushRequested_{};
  facebook::jsi::Runtime *uiRuntime_;
  std::function<void(std::function<void(const double)>)> requestAnimationFrame_;
};

} // namespace worklets
