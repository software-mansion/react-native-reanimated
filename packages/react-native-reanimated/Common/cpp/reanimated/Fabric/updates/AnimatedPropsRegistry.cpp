#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

#include <algorithm>
#include <utility>

namespace reanimated {

#if REACT_NATIVE_MINOR_VERSION >= 81
static inline std::shared_ptr<const ShadowNode> shadowNodeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper) {
  return Bridging<std::shared_ptr<const ShadowNode>>::fromJs(
      rt, shadowNodeWrapper);
}
#endif

void AnimatedPropsRegistry::update(
    jsi::Runtime &rt,
    const jsi::Value &operations) {
  auto operationsArray = operations.asObject(rt).asArray(rt);

  // Runs on the UI thread, while removeUnmounted runs on the JS thread from the
  // mount hook.
  std::lock_guard<std::mutex> lock{mutex_};
  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
    if (isUnmounted(shadowNode->getFamily())) {
      continue;
    }

    const jsi::Value &updates = item.getProperty(rt, "updates");
    addUpdatesToBatch(shadowNode, jsi::dynamicFromValue(rt, updates));
  }
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  std::lock_guard<std::mutex> lock{mutex_};
  updatesRegistry_.erase(tag);
}

void AnimatedPropsRegistry::removeUnmounted(
    const ShadowNodeFamily::Shared &shadowNodeFamily) {
  // Called on the JS thread while getPendingUpdates() may read the registry on
  // the UI thread holding only mutex_.
  std::lock_guard<std::mutex> lock{mutex_};
  const auto tag = shadowNodeFamily->getTag();
  updatesRegistry_.erase(tag);
  removePendingUpdates(tag);
  unmountedFamilies_[tag] = shadowNodeFamily;
  if (unmountedFamilies_.size() >= unmountedFamiliesPruneThreshold_) {
    pruneExpiredUnmountedFamilies();
  }
}

void AnimatedPropsRegistry::handleRemount(const Tag tag) {
  std::lock_guard<std::mutex> lock{mutex_};
  unmountedFamilies_.erase(tag);
}

bool AnimatedPropsRegistry::isUnmounted(
    const ShadowNodeFamily &shadowNodeFamily) const {
  const auto it = unmountedFamilies_.find(shadowNodeFamily.getTag());
  return it != unmountedFamilies_.end() &&
      it->second.lock().get() == &shadowNodeFamily;
}

void AnimatedPropsRegistry::pruneExpiredUnmountedFamilies() {
  std::erase_if(unmountedFamilies_, [](const auto &entry) {
    return entry.second.expired();
  });
  unmountedFamiliesPruneThreshold_ = std::max(
      MIN_UNMOUNTED_FAMILIES_PRUNE_THRESHOLD, 2 * unmountedFamilies_.size());
}

} // namespace reanimated
