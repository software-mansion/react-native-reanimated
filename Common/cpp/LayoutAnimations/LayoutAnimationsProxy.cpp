#include "LayoutAnimationsProxy.h"
#include "FrozenObject.h"
#include "MutableValue.h"
#include "ShareableValue.h"
#include "ValueWrapper.h"

namespace reanimated {

const long long idOffset = 1e9;

LayoutAnimationsProxy::LayoutAnimationsProxy(
    std::function<void(int, jsi::Object newProps)> _notifyAboutProgress,
    std::function<void(int, bool)> _notifyAboutEnd)
    : notifyAboutProgress(std::move(_notifyAboutProgress)),
      notifyAboutEnd(std::move(_notifyAboutEnd)) {}

void LayoutAnimationsProxy::startObserving(
    int tag,
    std::shared_ptr<MutableValue> sv,
    jsi::Runtime &rt) {
  observedValues[tag] = sv;
  sv->addListener(tag + idOffset, [sv, tag, this, &rt]() {
    std::shared_ptr<FrozenObject> newValue =
        ValueWrapper::asFrozenObject(sv->value->valueContainer);
    this->notifyAboutProgress(tag, newValue->shallowClone(rt));
  });
}

void LayoutAnimationsProxy::stopObserving(int tag, bool finished) {
  if (observedValues.count(tag) == 0) {
    return;
  }
  std::shared_ptr<MutableValue> sv = observedValues[tag];
  sv->removeListener(tag + idOffset);
  observedValues.erase(tag);
  this->notifyAboutEnd(tag, !finished);
}

void LayoutAnimationsProxy::notifyAboutCancellation(int tag) {
  this->notifyAboutEnd(tag, false);
}

void LayoutAnimationsProxy::configureAnimation(int tag, const std::string &type, std::shared_ptr<ShareableValue> config) {
  if (type == "entering") {
    enteringAnimations[tag] = config;
  } else if (type == "exiting") {
    exitingAnimations[tag] = config;
  } else if (type == "layout") {
    layoutAnimations[tag] = config;
  }
}

bool LayoutAnimationsProxy::hasLayoutAnimation(int tag, const std::string &type) {
  if (type == "entering") {
    return enteringAnimations.find(tag) != enteringAnimations.end();
  } else if (type == "exiting") {
    return exitingAnimations.find(tag) != exitingAnimations.end();
  } else if (type == "layout") {
    return layoutAnimations.find(tag) != layoutAnimations.end();
  }
  return false;
}

void LayoutAnimationsProxy::startLayoutAnimation(jsi::Runtime &rt, int tag, const std::string &type, const jsi::Object &values) {
  std::shared_ptr<ShareableValue> config;
  if (type == "entering") {
    config = enteringAnimations[tag];
  } else if (type == "exiting") {
    config = exitingAnimations[tag];
  } else if (type == "layout") {
    config = layoutAnimations[tag];
  }
  jsi::Value layoutAnimationRepositoryAsValue = rt.global().getPropertyAsObject(rt, "global").getProperty(rt, "LayoutAnimationRepository");
  if (!layoutAnimationRepositoryAsValue.isUndefined()) {
    jsi::Function startAnimationForTag =
        layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(rt, "startAnimationForTag");
    startAnimationForTag.call(rt, jsi::Value(tag), jsi::String::createFromAscii(rt, type), values, config->toJSValue(rt));
  }
}

} // namespace reanimated
