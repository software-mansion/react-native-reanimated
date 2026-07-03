#include <reanimated/CSS/registries/StaticPropsRegistry.h>

#include <utility>

namespace reanimated::css {

void StaticPropsRegistry::set(jsi::Runtime &rt, const Tag viewTag, const jsi::Value &props) {
  if (props.isNull() || props.isUndefined()) {
    remove(viewTag);
    return;
  }

  const auto newProps = dynamicFromValue(rt, props);
  folly::dynamic oldProps;
  {
    std::lock_guard<std::mutex> lock{mutex_};
    const auto it = registry_.find(viewTag);
    if (it != registry_.end()) {
      oldProps = it->second;
    }
    registry_[viewTag] = newProps;
  }
  if (!oldProps.isNull()) {
    notifyObservers(viewTag, oldProps, newProps);
  }
}

folly::dynamic StaticPropsRegistry::get(const Tag viewTag) const {
  std::lock_guard<std::mutex> lock{mutex_};
  auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return nullptr;
  }
  return it->second;
}

bool StaticPropsRegistry::has(const Tag viewTag) const {
  std::lock_guard<std::mutex> lock{mutex_};
  return registry_.find(viewTag) != registry_.end();
}

void StaticPropsRegistry::remove(const Tag viewTag) {
  std::lock_guard<std::mutex> lock{mutex_};
  registry_.erase(viewTag);
}

bool StaticPropsRegistry::isEmpty() const {
  std::lock_guard<std::mutex> lock{mutex_};
  return registry_.empty() && observers_.empty();
}

bool StaticPropsRegistry::hasObservers(const Tag viewTag) const {
  return observers_.find(viewTag) != observers_.end();
}

void StaticPropsRegistry::setObserver(const Tag viewTag, PropsObserver observer) {
  observers_[viewTag] = std::move(observer);
}

void StaticPropsRegistry::removeObserver(const Tag viewTag) {
  observers_.erase(viewTag);
}

void StaticPropsRegistry::notifyObservers(
    const Tag viewTag,
    const folly::dynamic &oldProps,
    const folly::dynamic &newProps) {
  auto observerIt = observers_.find(viewTag);
  if (observerIt != observers_.end()) {
    observerIt->second(oldProps, newProps);
  }
}

} // namespace reanimated::css
