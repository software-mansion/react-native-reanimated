#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

namespace reanimated {

JSIUpdates AnimatedPropsRegistry::getJSIUpdates() {
  return std::move(jsiUpdates_);
}

bool AnimatedPropsRegistry::isEmpty() const {
  return updatesRegistry_.empty();
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

    jsiUpdates_.emplace_back(tag, std::make_unique<jsi::Value>(rt, updates));

    if (updatesRegistry_.find(tag) == updatesRegistry_.end()) {
      updatesRegistry_[tag] = {shadowNode, jsi::dynamicFromValue(rt, updates)};
    } else {
      updatesRegistry_[tag].second.update(jsi::dynamicFromValue(rt, updates));
    }
  }
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  updatesRegistry_.erase(tag);
}

Updates AnimatedPropsRegistry::getFrameUpdates(double timestamp) {
  return std::exchange(updatesBatch_, Updates{});
}

Updates AnimatedPropsRegistry::getAllUpdates(double timestamp) {
  return updatesRegistry_;
}

} // namespace reanimated
