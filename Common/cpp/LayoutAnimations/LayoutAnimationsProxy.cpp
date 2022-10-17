#include "LayoutAnimationsProxy.h"
#include "FrozenObject.h"
#include "MutableValue.h"
#include "ShareableValue.h"
#include "ValueWrapper.h"

namespace reanimated {

const long long idOffset = 1e9;

LayoutAnimationsProxy::LayoutAnimationsProxy(
    std::function<void(int, jsi::Object newProps)> progressHandler,
    std::function<void(int, bool)> endHandler)
    : progressHandler(std::move(progressHandler)),
      endHandler(std::move(endHandler)) {}

void LayoutAnimationsProxy::startObserving(
    int tag,
    std::shared_ptr<MutableValue> sv,
    jsi::Runtime &rt) {
  observedValues[tag] = sv;
  this->progressHandler(tag, sv->value->toJSValue(rt).asObject(rt));
  sv->addListener(tag + idOffset, [sv, tag, this, &rt]() {
    this->progressHandler(tag, sv->value->toJSValue(rt).asObject(rt));
  });
}

void LayoutAnimationsProxy::stopObserving(int tag, bool finished) {
  if (observedValues.count(tag) == 0) {
    return;
  }
  std::shared_ptr<MutableValue> sv = observedValues[tag];
  sv->removeListener(tag + idOffset);
  observedValues.erase(tag);
  this->endHandler(tag, !finished);
}

void LayoutAnimationsProxy::configureAnimation(
    int tag,
    const std::string &type,
    std::shared_ptr<ShareableValue> config,
    std::shared_ptr<ShareableValue> viewSharedValue) {
  auto lock = std::unique_lock<std::mutex>(animationsLock);
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
  auto lock = std::unique_lock<std::mutex>(animationsLock);
  if (type == "entering") {
    return enteringAnimations.find(tag) != enteringAnimations.end();
  } else if (type == "exiting") {
    return exitingAnimations.find(tag) != exitingAnimations.end();
  } else if (type == "layout") {
    return layoutAnimations.find(tag) != layoutAnimations.end();
  }
  return false;
}

void LayoutAnimationsProxy::startLayoutAnimation(
    jsi::Runtime &rt,
    int tag,
    const std::string &type,
    const jsi::Object &values) {
  std::shared_ptr<ShareableValue> config;
  std::shared_ptr<ShareableValue> viewSharedValue;
  {
    auto lock = std::unique_lock<std::mutex>(animationsLock);
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
  if (!layoutAnimationRepositoryAsValue.isUndefined()) {
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
}

} // namespace reanimated
