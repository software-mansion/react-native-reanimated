#ifdef __APPLE__
#include <RNReanimated/Scheduler.h>
#else
#include "Scheduler.h"
#endif

#include "ReanimatedRuntime.h"
#include "RuntimeManager.h"

namespace reanimated {

void Scheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs_.push(std::move(job));
}

void Scheduler::scheduleOnJS(std::function<void()> job) {
  jsCallInvoker_->invokeAsync(std::move(job));
}

void Scheduler::triggerUI() {
  scheduledOnUI_ = false;
#if JS_RUNTIME_HERMES
  // JSI's scope defined here allows for JSI-objects to be cleared up after
  // each runtime loop. Within these loops we typically create some temporary
  // JSI objects and hence it allows for such objects to be garbage collected
  // much sooner.
  // Apparently the scope API is only supported on Hermes at the moment.
  const auto runtimeManager = weakRuntimeManager_.lock();
  const auto scope = jsi::Scope(*runtimeManager->runtime);
#endif
  while (uiJobs_.getSize()) {
    const auto job = uiJobs_.pop();
    job();
  }
}

void Scheduler::setJSCallInvoker(
    std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker) {
  jsCallInvoker_ = jsCallInvoker;
}

void Scheduler::setRuntimeManager(
    std::shared_ptr<RuntimeManager> runtimeManager) {
  weakRuntimeManager_ = runtimeManager;
}

Scheduler::~Scheduler() {}

} // namespace reanimated
