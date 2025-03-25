#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

namespace reanimated {

JSIUpdates AnimatedPropsRegistry::getJSIUpdates() {
  return std::move(jsiUpdates_);
}

bool AnimatedPropsRegistry::isEmpty() const {
  return registry_.empty();
}

void AnimatedPropsRegistry::add(
    jsi::Runtime &rt,
    const jsi::Value &operations) {
  auto operationsArray = operations.asObject(rt).asArray(rt);

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
    const auto tag = shadowNode->getTag();
    const jsi::Value &updates = item.getProperty(rt, "updates");

    updatesBatch_.emplace_back(shadowNode, jsi::dynamicFromValue(rt, updates));
    jsiUpdates_.emplace_back(
        shadowNode->getTag(), std::make_unique<jsi::Value>(rt, updates));
  }
}

folly::dynamic AnimatedPropsRegistry::get(const Tag tag) const {
  const auto it = registry_.find(tag);
  if (it == registry_.end()) {
    return nullptr;
  }
  return it->second.second;
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  registry_.erase(tag);
}

void AnimatedPropsRegistry::flushFrameUpdates(PropsBatch &updatesBatch) {
  // Store all updates from the batch in the registry for later usage
  addUpdatesToRegistry();

  updatesBatch.insert(
      updatesBatch.end(),
      std::make_move_iterator(updatesBatch_.begin()),
      std::make_move_iterator(updatesBatch_.end()));
  updatesBatch_.clear();
};

void AnimatedPropsRegistry::collectAllProps(PropsMap &propsMap) {
  addUpdatesToRegistry();
  updatesBatch_.clear();

  for (const auto &[_, pair] : registry_) {
    const auto &[shadowNode, props] = pair;
    addToPropsMap(propsMap, shadowNode, props);
  };
}

void AnimatedPropsRegistry::addUpdatesToRegistry() {
  for (const auto &update : updatesBatch_) {
    const auto &[shadowNode, props] = update;
    const auto tag = shadowNode->getTag();

    const auto it = registry_.find(tag);
    if (it == registry_.end()) {
      registry_.emplace(tag, update);
    } else {
      it->second.second.update(props);
    }
  }
}

} // namespace reanimated
