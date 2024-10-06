#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

void TransformsStyleInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &keyframes) {
  // TODO - add a possibility to remove interpolators that are no longer used
  // (for now, for simplicity, we only add new ones)
  const auto keyframesArray = keyframes.asObject(rt).asArray(rt);

  auto [transformsMap, orderedPropertyNames] =
      extractTransformsMapAndOrderedProperties(rt, keyframesArray);
  orderedPropertyNames_ = orderedPropertyNames;

  for (const auto &propertyName : orderedPropertyNames) {
    addOrUpdateInterpolator(
        rt, shadowNode, propertyName, transformsMap.at(propertyName));
  }
}

jsi::Value TransformsStyleInterpolator::mapInterpolators(
    jsi::Runtime &rt,
    std::function<jsi::Value(Interpolator &)> callback) const {
  jsi::Array result(rt, interpolators_.size());
  size_t index = 0;

  for (const auto &propertyName : orderedPropertyNames_) {
    const auto &interpolator = interpolators_.at(propertyName);
    jsi::Value value = callback(*interpolator);

    if (!value.isUndefined()) {
      jsi::Object obj(rt);
      obj.setProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName), value);
      result.setValueAtIndex(rt, index++, obj);
    }
  }

  // If no results were added, return undefined
  if (index == 0) {
    return jsi::Value::undefined();
  }

  return result;
}

} // namespace reanimated
