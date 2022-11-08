#include "LayoutAnimationsProxy.h"
#include "FrozenObject.h"
#include "MutableValue.h"
#include "ShareableValue.h"
#include "ValueWrapper.h"

#include <utility>

namespace reanimated {

const long long idOffset = 1e9;

LayoutAnimationsProxy::LayoutAnimationsProxy(
    std::function<void(int, jsi::Object newProps)> progressHandler,
    std::function<void(int, bool, bool)> endHandler,
    std::weak_ptr<ErrorHandler> errorHandler)
    : progressHandler_(std::move(progressHandler)),
      endHandler_(std::move(endHandler)),
      weakErrorHandler_(errorHandler) {}

void LayoutAnimationsProxy::startObserving(
    int tag,
    std::shared_ptr<MutableValue> sv,
    jsi::Runtime &rt) {
  observedValues[tag] = sv;
  this->progressHandler_(tag, sv->value->toJSValue(rt).asObject(rt));
  sv->addListener(tag + idOffset, [sv, tag, this, &rt]() {
    this->progressHandler_(tag, sv->value->toJSValue(rt).asObject(rt));
  });
}

void LayoutAnimationsProxy::stopObserving(
    int tag,
    bool finished,
    bool removeView) {
  if (observedValues.count(tag) == 0) {
    return;
  }
  std::shared_ptr<MutableValue> sv = observedValues[tag];
  sv->removeListener(tag + idOffset);
  observedValues.erase(tag);
  this->endHandler_(tag, !finished, removeView);
}

void LayoutAnimationsProxy::configureAnimation(
    int tag,
    const std::string &type,
    std::shared_ptr<ShareableValue> config,
    std::shared_ptr<ShareableValue> viewSharedValue) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  if (type == "entering") {
    enteringAnimations[tag] = config;
  } else if (type == "exiting") {
    exitingAnimations[tag] = config;
  } else if (type == "layout") {
    layoutAnimations[tag] = config;
  }
  viewSharedValues[tag] = viewSharedValue;
}

bool LayoutAnimationsProxy::hasLayoutAnimation(
    int tag,
    const std::string &type) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  if (type == "entering") {
    return enteringAnimations.find(tag) != enteringAnimations.end();
  } else if (type == "exiting") {
    return exitingAnimations.find(tag) != exitingAnimations.end();
  } else if (type == "layout") {
    return layoutAnimations.find(tag) != layoutAnimations.end();
  }
  return false;
}

void LayoutAnimationsProxy::clearLayoutAnimationConfig(int tag) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  enteringAnimations.erase(tag);
  exitingAnimations.erase(tag);
  layoutAnimations.erase(tag);
  viewSharedValues.erase(tag);
}

void LayoutAnimationsProxy::startLayoutAnimation(
    jsi::Runtime &rt,
    int tag,
    const std::string &type,
    const jsi::Object &values) {
  std::shared_ptr<ShareableValue> config;
  std::shared_ptr<ShareableValue> viewSharedValue;
  {
    auto lock = std::unique_lock<std::mutex>(animationsMutex_);
    if (type == "entering") {
      config = enteringAnimations[tag];
    } else if (type == "exiting") {
      config = exitingAnimations[tag];
    } else if (type == "layout") {
      config = layoutAnimations[tag];
    }
    viewSharedValue = viewSharedValues[tag];
  }

  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global()
          .getPropertyAsObject(rt, "global")
          .getProperty(rt, "LayoutAnimationRepository");
  if (layoutAnimationRepositoryAsValue.isUndefined()) {
    auto errorHandler = weakErrorHandler_.lock();
    if (errorHandler != nullptr) {
      errorHandler->setError(
          "startLayoutAnimation called before initializing LayoutAnimationRepository");
      errorHandler->raise();
    }
    return;
  }
  jsi::Function startAnimationForTag =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(
          rt, "startAnimationForTag");
  startAnimationForTag.call(
      rt,
      jsi::Value(tag),
      jsi::String::createFromAscii(rt, type),
      values,
      config->toJSValue(rt),
      viewSharedValue->toJSValue(rt));
}

} // namespace reanimated
