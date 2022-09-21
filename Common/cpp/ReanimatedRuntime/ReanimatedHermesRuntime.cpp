#include "ReanimatedHermesRuntime.h"

// Only include this file in Hermes-enabled builds as some platforms (like tvOS)
// don't support hermes and it causes the compilation to fail.
#if JS_RUNTIME_HERMES

#include <cxxreact/MessageQueueThread.h>
#include <jsi/decorator.h>
#include <jsi/jsi.h>

#include <memory>
#include <utility>

#if __has_include(<reacthermes/HermesExecutorFactory.h>)
#include <reacthermes/HermesExecutorFactory.h>
#else // __has_include(<hermes/hermes.h>) || ANDROID
#include <hermes/hermes.h>
#endif

#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>

namespace reanimated {

using namespace facebook;
using namespace react;

#if HERMES_ENABLE_DEBUGGER

class HermesExecutorRuntimeAdapter
    : public facebook::hermes::inspector::RuntimeAdapter {
 public:
  HermesExecutorRuntimeAdapter(
      facebook::hermes::HermesRuntime &hermesRuntime,
      std::shared_ptr<MessageQueueThread> thread)
      : hermesRuntime_(hermesRuntime), thread_(std::move(thread)) {}

  virtual ~HermesExecutorRuntimeAdapter() {
    // This is required by iOS, because there is an assertion in the destructor
    // that the thread was indeed `quit` before
    thread_->quitSynchronous();
  }

  facebook::jsi::Runtime &getRuntime() override {
    return hermesRuntime_;
  }

  facebook::hermes::debugger::Debugger &getDebugger() override {
    return hermesRuntime_.getDebugger();
  }

  // This is not empty in the original implementation, but we decided to tickle
  // the runtime by running a small piece of code on every frame as using this
  // required us to hold a refernce to the runtime inside this adapter which
  // caused issues while reloading the app.
  void tickleJs() override {}

 public:
  facebook::hermes::HermesRuntime &hermesRuntime_;
  std::shared_ptr<MessageQueueThread> thread_;
};

#endif // HERMES_ENABLE_DEBUGGER

ReanimatedHermesRuntime::ReanimatedHermesRuntime(
    std::unique_ptr<facebook::hermes::HermesRuntime> runtime,
    std::shared_ptr<MessageQueueThread> jsQueue)
    : jsi::WithRuntimeDecorator<ReanimatedReentrancyCheck>(
          *runtime,
          reentrancyCheck_),
      runtime_(std::move(runtime)) {
#if HERMES_ENABLE_DEBUGGER
  auto adapter =
      std::make_unique<HermesExecutorRuntimeAdapter>(*runtime_, jsQueue);
  facebook::hermes::inspector::chrome::enableDebugging(
      std::move(adapter), "Reanimated Runtime");
#else
  // This is required by iOS, because there is an assertion in the destructor
  // that the thread was indeed `quit` before
  jsQueue->quitSynchronous();
#endif
}

ReanimatedHermesRuntime::~ReanimatedHermesRuntime() {
#if HERMES_ENABLE_DEBUGGER
  // We have to disable debugging before the runtime is destroyed.
  facebook::hermes::inspector::chrome::disableDebugging(*runtime_);
#endif
}

} // namespace reanimated

#endif // JS_RUNTIME_HERMES
