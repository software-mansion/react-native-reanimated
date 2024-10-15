#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

TransformsStyleInterpolator::TransformsStyleInterpolator(
    const TransformsInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : PropertyInterpolator(propertyPath),
      factories_(factories),
      viewStylesRepository_(viewStylesRepository) {}

jsi::Value TransformsStyleInterpolator::getCurrentValue(
    jsi::Runtime &rt) const {
  // TODO: implement getCurrentValue
  return jsi::Value::undefined();
}

jsi::Value TransformsStyleInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  // TODO: implement getStyleValue
  return jsi::Value::undefined();
}

void TransformsStyleInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &keyframes) {
  // TODO: implement updateKeyframes
}

void TransformsStyleInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  // TODO: implement updateKeyframesFromStyleChange
}

jsi::Value TransformsStyleInterpolator::update(
    const InterpolationUpdateContext context) {
  // TODO: implement update
  return jsi::Value::undefined();
}

} // namespace reanimated
