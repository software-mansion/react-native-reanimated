#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

namespace reanimated {

JSIUpdates AnimatedPropsRegistry::getNonAnimatablePropUpdates() {
  return std::move(nonAnimatablePropUpdates_);
}

void AnimatedPropsRegistry::update(
    jsi::Runtime &rt,
    const jsi::Value &operations,
    const std::unordered_set<std::string> &animatablePropNames) {
  auto operationsArray = operations.asObject(rt).asArray(rt);

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

    const jsi::Value &updates = item.getProperty(rt, "updates");
    addUpdatesToBatch(shadowNode, jsi::dynamicFromValue(rt, updates));
    addNonAnimatablePropUpdates(
        rt, shadowNode->getTag(), updates, animatablePropNames);
  }
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  updatesRegistry_.erase(tag);
}

void AnimatedPropsRegistry::addNonAnimatablePropUpdates(
    jsi::Runtime &rt,
    const Tag tag,
    const jsi::Value &props,
    const std::unordered_set<std::string> &animatablePropNames) {
  jsi::Object nonAnimatableProps(rt);
  bool hasNonAnimatableProps = false;

  const jsi::Object &propsObject = props.asObject(rt);
  const jsi::Array &propNames = propsObject.getPropertyNames(rt);

  for (size_t i = 0; i < propNames.size(rt); ++i) {
    const std::string &propName =
        propNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto &propNameStr = propName.c_str();
    const jsi::Value &propValue = propsObject.getProperty(rt, propNameStr);

    if (!animatablePropNames.contains(propName)) {
      nonAnimatableProps.setProperty(rt, propNameStr, propValue);
      hasNonAnimatableProps = true;
    }
  }

  if (hasNonAnimatableProps) {
    nonAnimatablePropUpdates_.emplace_back(
        tag, std::make_unique<jsi::Value>(rt, nonAnimatableProps));
  }
}

} // namespace reanimated
