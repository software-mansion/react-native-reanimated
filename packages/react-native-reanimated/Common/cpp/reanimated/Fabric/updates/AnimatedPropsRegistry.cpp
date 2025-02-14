#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

namespace reanimated {

JSIUpdates AnimatedPropsRegistry::getJSIUpdates() {
  return std::move(jsiUpdates_);
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
    addUpdatesToBatch(shadowNode, jsi::dynamicFromValue(rt, updates));
    jsiUpdates_.emplace_back(
        shadowNode->getTag(), std::make_unique<jsi::Value>(rt, updates));
    surfaceId = shadowNode->getSurfaceId();
  }

  return surfaceId;
}

void AnimatedPropsRegistry::remove(
    jsi::Runtime &rt,
    const jsi::Value &viewTags) {
  auto viewTagsArray = viewTags.asObject(rt).asArray(rt);

  for (size_t i = 0, length = viewTagsArray.size(rt); i < length; ++i) {
    tagsToRemove_.insert(
        static_cast<Tag>(viewTagsArray.getValueAtIndex(rt, i).asNumber()));
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
