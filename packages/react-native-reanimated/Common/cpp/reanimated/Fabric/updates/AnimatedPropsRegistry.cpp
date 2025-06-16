#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

#include <utility>

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
    JSIUpdate update{
        .tag = shadowNode->getTag(),
        .componentName = shadowNode->getComponentName(),
        .props = std::make_unique<jsi::Value>(rt, updates)};
    jsiUpdates_.emplace_back(std::move(update));
    surfaceId = shadowNode->getSurfaceId();
  }

  return surfaceId;
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  updatesRegistry_.erase(tag);
}

} // namespace reanimated
