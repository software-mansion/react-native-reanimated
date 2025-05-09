#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/Defs.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <jsi/jsi.h>

#include <memory>
#include <utility>

using namespace facebook;

namespace worklets {

WorkletsModuleProxy::WorkletsModuleProxy(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    std::function<void(std::function<void(const double)>)>
        &&forwardedRequestAnimationFrame)
    : jsQueue_(jsQueue),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      uiWorkletRuntime_(std::make_shared<WorkletRuntime>(
          rnRuntime,
          createJSIWorkletsModuleProxy(),
          jsQueue_,
          jsScheduler_,
          "Reanimated UI runtime",
          true /* supportsLocking */)),
      animationFrameBatchinator_(std::make_shared<AnimationFrameBatchinator>(
          uiWorkletRuntime_->getJSIRuntime(),
          std::move(forwardedRequestAnimationFrame))) {
  UIRuntimeDecorator::decorate(
      uiWorkletRuntime_->getJSIRuntime(),
      animationFrameBatchinator_->getJsiRequestAnimationFrame());
}

std::shared_ptr<jsi::HostObject>
WorkletsModuleProxy::createJSIWorkletsModuleProxy() const {
  return std::make_shared<JSIWorkletsModuleProxy>(
      jsQueue_, jsScheduler_, uiScheduler_, uiWorkletRuntime_);
}

WorkletsModuleProxy::~WorkletsModuleProxy() {
  animationFrameBatchinator_.reset();
  jsQueue_->quitSynchronous();
  uiWorkletRuntime_.reset();
}

} // namespace worklets
