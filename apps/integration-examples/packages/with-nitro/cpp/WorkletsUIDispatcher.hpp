#pragma once

#include <NitroModules/Dispatcher.hpp>
#include <worklets/Compat/StableApi.h>

#include <memory>
#include <stdexcept>

namespace margelo::nitro::withnitro {

class WorkletsUIDispatcher final : public Dispatcher {
 public:
  static void
  install(jsi::Runtime &rnRuntime, const jsi::Object &uiRuntimeHolder, const jsi::Object &uiSchedulerHolder) {
    std::weak_ptr<worklets::WorkletRuntime> uiRuntime =
        worklets::getWorkletRuntimeFromHolder(rnRuntime, uiRuntimeHolder);
    auto uiScheduler = worklets::getUISchedulerFromHolder(rnRuntime, uiSchedulerHolder);
    std::weak_ptr<worklets::UIScheduler> weakUIScheduler = uiScheduler;
    worklets::scheduleOnUI(uiScheduler, [uiRuntime, weakUIScheduler] {
      auto runtime = uiRuntime.lock();
      auto scheduler = weakUIScheduler.lock();
      if (runtime && scheduler) {
        installRuntimeGlobalDispatcher(
            worklets::getJSIRuntimeFromWorkletRuntime(runtime),
            std::make_shared<WorkletsUIDispatcher>(uiRuntime, scheduler));
      }
    });
  }

  WorkletsUIDispatcher(
      std::weak_ptr<worklets::WorkletRuntime> uiRuntime,
      std::shared_ptr<worklets::UIScheduler> uiScheduler)
      : uiRuntime_(std::move(uiRuntime)), uiScheduler_(std::move(uiScheduler)) {}

  void runAsync(std::function<void()> &&function) override {
    worklets::scheduleOnUI(uiScheduler_, [uiRuntime = uiRuntime_, function = std::move(function)] {
      if (auto runtime = uiRuntime.lock()) {
        function();
      }
    });
  }

  void runSync(std::function<void()> &&function) override {
    if (!worklets::isOnUIThread(uiScheduler_)) {
      throw std::runtime_error("WorkletsUIDispatcher::runSync() works only on the UI thread.");
    }
    function();
  }

 private:
  std::weak_ptr<worklets::WorkletRuntime> uiRuntime_;
  std::shared_ptr<worklets::UIScheduler> uiScheduler_;
};

} // namespace margelo::nitro::withnitro
