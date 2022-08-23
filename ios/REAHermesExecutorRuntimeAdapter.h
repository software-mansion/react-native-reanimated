#pragma once

#include <hermes/hermes.h>
#include <reacthermes/Registration.h>
#include <reacthermes/RuntimeAdapter.h>
#include <memory>
#include "REAMessageThread.h"

namespace reanimated {

using namespace facebook;
using namespace react;

class HermesExecutorRuntimeAdapter
    : public facebook::hermes::inspector::RuntimeAdapter {
 public:
  HermesExecutorRuntimeAdapter(
      std::shared_ptr<facebook::jsi::Runtime> runtime,
      facebook::hermes::HermesRuntime &hermesRuntime,
      std::shared_ptr<REAMessageThread> thread)
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
  std::shared_ptr<REAMessageThread> thread_;
};

} // namespace reanimated
