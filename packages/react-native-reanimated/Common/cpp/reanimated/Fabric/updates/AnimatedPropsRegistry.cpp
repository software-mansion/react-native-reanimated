#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

namespace reanimated {

JSIUpdates AnimatedPropsRegistry::getJSIUpdates() {
  return std::move(jsiUpdates_);
}

bool AnimatedPropsRegistry::isEmpty() const {
  return registry_.empty();
}

folly::dynamic AnimatedPropsRegistry::get(const Tag viewTag) const {
  std::lock_guard<std::mutex> lock{mutex_};

  auto it = registry_.find(viewTag);
  if (it == registry_.cend()) {
    return nullptr;
  }
  return it->second.second;
}

SurfaceId AnimatedPropsRegistry::update(
    jsi::Runtime &rt,
    const jsi::Value &operations) {
  auto operationsArray = operations.asObject(rt).asArray(rt);
  SurfaceId surfaceId = -1;

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

    const jsi::Value &updates = item.getProperty(rt, "updates");
    updatesBatch_.emplace_back(shadowNode, jsi::dynamicFromValue(rt, updates));
    jsiUpdates_.emplace_back(
        shadowNode->getTag(), std::make_unique<jsi::Value>(rt, updates));
    surfaceId = shadowNode->getSurfaceId();
  }

  return surfaceId;
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  registry_.erase(tag);
}

// This method is needed to ensure that types are compatible
UpdatesBatch AnimatedPropsRegistry::collectUpdates(double) {
  return collectUpdates();
}

UpdatesBatch AnimatedPropsRegistry::collectUpdates() {
  auto result = std::move(updatesBatch_);
  updatesBatch_.clear();

  for (auto &[shadowNode, props] : result) {
    const auto tag = shadowNode->getTag();
    auto it = registry_.find(tag);

    if (it == registry_.cend()) {
      registry_[tag] = std::make_pair(shadowNode, props);
    } else {
      it->second.second.update(props);
    }
  }

  return result;
}

} // namespace reanimated
