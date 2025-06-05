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

#include <memory>
#include <utility>

using namespace facebook;

namespace worklets {

auto isDevBundleFromRNRuntime(jsi::Runtime &rnRuntime) -> bool;

WorkletsModuleProxy::WorkletsModuleProxy(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    std::function<void(std::function<void(const double)>)>
        &&forwardedRequestAnimationFrame,
    const std::shared_ptr<const BigStringBuffer> &script,
    const std::string &sourceUrl)
    : isDevBundle_(isDevBundleFromRNRuntime(rnRuntime)),
      jsQueue_(jsQueue),
      jsScheduler_(std::make_shared<JSScheduler>(rnRuntime, jsCallInvoker)),
      uiScheduler_(uiScheduler),
      script_(std::move(script)),
      sourceUrl_(sourceUrl) {
  uiWorkletRuntime_ = std::make_shared<WorkletRuntime>(
      rnRuntime,
      createJSIWorkletsModuleProxy(),
      jsQueue_,
      jsScheduler_,
      "Reanimated UI runtime",
      true /* supportsLocking */,
      isDevBundle_,
      script_,
      sourceUrl_);

  animationFrameBatchinator_ = std::make_shared<AnimationFrameBatchinator>(
      uiWorkletRuntime_->getJSIRuntime(),
      std::move(forwardedRequestAnimationFrame));

  UIRuntimeDecorator::decorate(
      uiWorkletRuntime_->getJSIRuntime(),
      animationFrameBatchinator_->getJsiRequestAnimationFrame());
}

std::shared_ptr<jsi::HostObject>
WorkletsModuleProxy::createJSIWorkletsModuleProxy() const {
  return std::make_shared<JSIWorkletsModuleProxy>(
      isDevBundle_,
      script_,
      sourceUrl_,
      jsQueue_,
      jsScheduler_,
      uiScheduler_,
      uiWorkletRuntime_);
}

WorkletsModuleProxy::~WorkletsModuleProxy() {
  animationFrameBatchinator_.reset();
  jsQueue_->quitSynchronous();
  uiWorkletRuntime_.reset();
}

auto isDevBundleFromRNRuntime(jsi::Runtime &rnRuntime) -> bool {
  const auto rtDev = rnRuntime.global().getProperty(rnRuntime, "__DEV__");
  return rtDev.isBool() && rtDev.asBool();
}

} // namespace worklets
