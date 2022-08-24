#pragma once

#include <hermes/hermes.h>
#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>
#include <memory>

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
    facebook::hermes::inspector::chrome::disableDebugging(hermesRuntime_);
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

} // namespace reanimated