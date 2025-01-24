#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/registry/StaticPropsRegistry.h>

namespace reanimated {

void StaticPropsRegistry::set(
    jsi::Runtime &rt,
    const Tag viewTag,
    const jsi::Value &props) {
  if (props.isNull() || props.isUndefined()) {
    remove(viewTag);
  } else {
    const auto newProps = dynamicFromValue(rt, props);
    notifyObservers(rt, viewTag, valueFromDynamic(rt, get(viewTag)), props);
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

bool StaticPropsRegistry::hasObservers(const Tag viewTag) const {
  return observers_.find(viewTag) != observers_.end();
}

void StaticPropsRegistry::setObserver(
    const Tag viewTag,
    PropsObserver observer) {
  observers_[viewTag] = std::move(observer);
}

void StaticPropsRegistry::removeObserver(const Tag viewTag) {
  observers_.erase(viewTag);
}

void StaticPropsRegistry::notifyObservers(
    jsi::Runtime &rt,
    const Tag viewTag,
    const jsi::Value &oldProps,
    const jsi::Value &newProps) {
  auto observerIt = observers_.find(viewTag);
  if (observerIt != observers_.end()) {
    observerIt->second(rt, oldProps, newProps);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
