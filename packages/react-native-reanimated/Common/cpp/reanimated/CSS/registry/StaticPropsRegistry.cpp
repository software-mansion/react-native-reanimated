#include <reanimated/CSS/registry/StaticPropsRegistry.h>

namespace reanimated::css {

void StaticPropsRegistry::update(
    const ShadowNode::Shared &shadowNode,
    const folly::dynamic &props) {
  const auto tag = shadowNode->getTag();

  if (props.empty()) {
    remove(tag);
    return;
  }

  if (has(tag)) {
    notifyObservers(tag, get(tag), props);
  }
  registry_[tag] = {shadowNode, props};
}

folly::dynamic StaticPropsRegistry::get(const Tag viewTag) const {
  auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return nullptr;
  }
  return it->second.second;
}

bool StaticPropsRegistry::has(const Tag viewTag) const {
  return registry_.find(viewTag) != registry_.end();
}

void StaticPropsRegistry::remove(const Tag viewTag) {
  registry_.erase(viewTag);
}

bool StaticPropsRegistry::isEmpty() const {
  return registry_.empty() && observers_.empty();
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

void StaticPropsRegistry::collectAllProps(PropsMap &propsMap) {
  for (const auto &[viewTag, pair] : registry_) {
    const auto &[shadowNode, props] = pair;
    addToPropsMap(propsMap, shadowNode, props);
  }
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
