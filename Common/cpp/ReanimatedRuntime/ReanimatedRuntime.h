#pragma once

// JS_RUNTIME_HERMES is only set on Android so we have to check __has_include
// on iOS.
#if __APPLE__ &&    \
    (__has_include( \
        <reacthermes/HermesExecutorFactory.h>) || __has_include(<hermes/hermes.h>))
#define JS_RUNTIME_HERMES 1
#endif

#include <cxxreact/MessageQueueThread.h>
#include <jsi/decorator.h>
#include <jsi/jsi.h>

#include <memory>
#include <utility>

namespace reanimated {

using namespace facebook;
using namespace react;

struct AroundLock {
  std::recursive_mutex mutex;
  void before() {
    mutex.lock();
  }
  void after() {
    mutex.unlock();
  }
  std::unique_lock<std::recursive_mutex> lock() {
    return std::unique_lock<std::recursive_mutex>(mutex);
  }
};

class ReanimatedRuntime : public jsi::WithRuntimeDecorator<AroundLock> {
 private:
  AroundLock aroundLock_;
  std::shared_ptr<jsi::Runtime> runtime_;

 public:
  explicit ReanimatedRuntime(std::shared_ptr<jsi::Runtime> &&runtime)
      : jsi::WithRuntimeDecorator<AroundLock>(*runtime, aroundLock_),
        runtime_(std::move(runtime)) {}
  std::unique_lock<std::recursive_mutex> lock() {
    return aroundLock_.lock();
  }
  static std::shared_ptr<ReanimatedRuntime> make(
      jsi::Runtime *rnRuntime,
      const std::shared_ptr<MessageQueueThread> &jsQueue);
};

} // namespace reanimated
