#include "HermesRuntimeManager.h"

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>

#if __has_include(<reacthermes/HermesExecutorFactory.h>)
#include <reacthermes/HermesExecutorFactory.h>
#else // __has_include(<hermes/hermes.h>) or ANDROID
#include <hermes/hermes.h>
#endif

#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>

namespace reanimated {

using namespace facebook;
using namespace react;

class HermesExecutorRuntimeAdapter
    : public facebook::hermes::inspector::RuntimeAdapter {
 public:
  HermesExecutorRuntimeAdapter(
      std::shared_ptr<facebook::jsi::Runtime> runtime,
      facebook::hermes::HermesRuntime &hermesRuntime,
      std::shared_ptr<MessageQueueThread> thread)
      : runtime_(runtime),
        hermesRuntime_(hermesRuntime),
        thread_(std::move(thread)) {}

  virtual ~HermesExecutorRuntimeAdapter() {
    thread_->quitSynchronous();
  };

  facebook::jsi::Runtime &getRuntime() override {
    return *runtime_;
  }

  facebook::hermes::debugger::Debugger &getDebugger() override {
    return hermesRuntime_.getDebugger();
  }

  void tickleJs() override {
    // The queue will ensure that runtime_ is still valid when this
    // gets invoked.
    thread_->runOnQueue([&runtime = runtime_]() {
      auto func =
          runtime->global().getPropertyAsFunction(*runtime, "__tickleJs");
      func.call(*runtime);
    });
  }

 public:
  std::shared_ptr<facebook::jsi::Runtime> runtime_;
  facebook::hermes::HermesRuntime &hermesRuntime_;
  std::shared_ptr<MessageQueueThread> thread_;
};

HermesRuntimeManager::HermesRuntimeManager(
#if HERMES_ENABLE_DEBUGGER
    std::shared_ptr<MessageQueueThread> messageQueueThread
#endif
    )
    : runtime_(facebook::hermes::makeHermesRuntime()),
      hermesRuntime_(*runtime_) {
#if HERMES_ENABLE_DEBUGGER
  auto adapter = std::make_unique<HermesExecutorRuntimeAdapter>(
      runtime_, hermesRuntime_, std::move(messageQueueThread));
  facebook::hermes::inspector::chrome::enableDebugging(
      std::move(adapter), "Reanimated runtime");
#endif
}

HermesRuntimeManager::~HermesRuntimeManager() {
#if HERMES_ENABLE_DEBUGGER
  facebook::hermes::inspector::chrome::disableDebugging(hermesRuntime_);
#endif
}

std::shared_ptr<facebook::jsi::Runtime> HermesRuntimeManager::getRuntime() {
  return runtime_;
}

} // namespace reanimated
