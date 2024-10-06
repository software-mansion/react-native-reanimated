#include <reanimated/CSS/prop/StaticPropsRegistry.h>

namespace reanimated {

void StaticPropsRegistry::set(
    jsi::Runtime &rt,
    const Tag viewTag,
    const jsi::Value &props) {
  if (props.isNull() || props.isUndefined()) {
    remove(viewTag);
  } else {
    const auto newProps = dynamicFromValue(rt, props);
    notifyObservers(
        rt,
        viewTag,
        valueFromDynamic(rt, get(viewTag)),
        valueFromDynamic(rt, newProps));
    registry_[viewTag] = newProps;
  }
}

folly::dynamic StaticPropsRegistry::get(const Tag viewTag) const {
  auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return nullptr;
  }
  return it->second;
}

void StaticPropsRegistry::remove(const Tag viewTag) {
  registry_.erase(viewTag);
}

void StaticPropsRegistry::addObserver(
    const unsigned observerId,
    const Tag viewTag,
    PropsObserver observer) {
  observers_[viewTag][observerId] = observer;
  observerTags_[observerId] = viewTag;
}

void StaticPropsRegistry::removeObserver(const unsigned observerId) {
  auto it = observerTags_.find(observerId);
  if (it == observerTags_.end()) {
    return;
  }
  auto viewTag = it->second;
  observerTags_.erase(it);
  observers_[viewTag].erase(observerId);
}

void StaticPropsRegistry::notifyObservers(
    jsi::Runtime &rt,
    const Tag viewTag,
    const jsi::Value &oldProps,
    const jsi::Value &newProps) {
  auto it = observers_.find(viewTag);
  if (it == observers_.end()) {
    return;
  }
  for (auto &observer : it->second) {
    observer.second(rt, oldProps, newProps);
  }
}

} // namespace reanimated
