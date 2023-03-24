#include "JSCallbacksManager.h"

namespace reanimated {

JSCallbacksManager::JSCallbacksManager(
  std::shared_ptr<JSRuntimeHelper> runtimeHelper, 
  PlatformDepMethodsHolder platformDepMethodsHolder
) : runtimeHelper_(runtimeHelper) {}

jsi::Value JSCallbacksManager::registerJSCallback(
    jsi::Runtime &rt,
    const jsi::Value &type,
    const jsi::Value &configuration,
    const jsi::Value &callback) {
  auto shareableHandler = extractShareableOrThrow(rt, callback);
  JSCallbackType typeEnum = static_cast<JSCallbackType>(static_cast<int>(type.asNumber()));
  if (typeEnum == JSCallbackType::SHARED_TRANSITION_PROGRESS_CALLBACK) {
    addSharedAnimationProgressCallback(shareableHandler, configuration);
  }
  return jsi::Value::undefined();
}

void JSCallbacksManager::unregisterJSCallback(
    jsi::Runtime &rt,
    const jsi::Value &type,
    const jsi::Value &callbackId) {
  JSCallbackType typeEnum = static_cast<JSCallbackType>(static_cast<int>(type.asNumber()));
  // to do
}

void JSCallbacksManager::unregisterJSCallback(JSCallbackType type, int callbackId) {
  // to do
}

void JSCallbacksManager::setRuntimeHelper(std::shared_ptr<JSRuntimeHelper> runtimeHelper) {
  runtimeHelper_ = runtimeHelper;
}

std::shared_ptr<JSRuntimeHelper> JSCallbacksManager::getRuntimeHelper() {
  return runtimeHelper_;
}

void JSCallbacksManager::addSharedAnimationProgressCallback(
  std::shared_ptr<Shareable> shareableCallback,
  const jsi::Value &configuration
) {
  auto &rt = *runtimeHelper_->rnRuntime();
  int viewTag = configuration.asObject(rt).getProperty(rt, "viewTag").asNumber();
  sharedAnimationProgressCallback_[viewTag] = [shareableCallback, weakRuntimeHelper = std::weak_ptr<JSRuntimeHelper>(runtimeHelper_)]
    (const jsi::Value &sharedAnimationWorkletData, const double progress) {
    auto runtimeHelper = weakRuntimeHelper.lock();
    if (runtimeHelper == nullptr || runtimeHelper->uiRuntimeDestroyed) {
      return jsi::Value::null();
    }
    auto uiRuntime = runtimeHelper->uiRuntime();
    auto handler = shareableCallback->getJSValue(*uiRuntime);
    return runtimeHelper->runOnUIGuardedWithResult(handler, sharedAnimationWorkletData, progress);
  };
}

jsi::Value JSCallbacksManager::executeSharedAnimationProgressCallback(
  const int viewTag,
  const double progress,
  const jsi::Value &sharedAnimationWorkletData
) {
  auto callback = sharedAnimationProgressCallback_[viewTag];
  if (callback) {
    return callback(sharedAnimationWorkletData, progress);
  }
  return jsi::Object(*runtimeHelper_->uiRuntime());
}

} // namespace reanimated
