#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

TransformsStyleInterpolator::TransformsStyleInterpolator(
    const TransformsInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : PropertyInterpolator(propertyPath),
      factories_(factories),
      viewStylesRepository_(viewStylesRepository) {}

jsi::Value TransformsStyleInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return viewStylesRepository_->getStyleProp(
      rt, shadowNode->getTag(), propertyPath_);
}

void TransformsStyleInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  keyframeIndex_ = 0;

  // Step 1: Parse keyframes
  const auto parsedKeyframes = parseJSIKeyframes(rt, keyframes);

  // Step 2: Convert keyframes to TransformOperations
  std::vector<std::pair<double, TransformOperations>> operations;
  operations.reserve(parsedKeyframes.size());
  for (const auto &[offset, value] : parsedKeyframes) {
    operations.emplace_back(offset, parseTransformOperations(rt, value));
  }

  // Check if conversion is correct
  for (const auto &[offset, value] : operations) {
    LOG(INFO) << "Offset: " << offset;
    for (const auto &operation : value) {
      LOG(INFO) << "Operation: "
                << stringifyJSIValue(rt, operation->toJSIValue(rt));
    }
  }

  // Step 3: Prepare keyframe interpolation pairs (convert keyframe values in
  // both keyframes to the same type)
}

void TransformsStyleInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  keyframeIndex_ = 0;
  keyframes_.clear();
  keyframes_.reserve(1);
  // TODO
}

jsi::Value TransformsStyleInterpolator::update(
    const InterpolationUpdateContext context) {
  // TODO: implement update
  return jsi::Value::undefined();
}

TransformOperations TransformsStyleInterpolator::parseTransformOperations(
    jsi::Runtime &rt,
    const jsi::Value &values) const {
  if (values.isUndefined()) {
    return {};
  }

  const auto transformsArray = values.asObject(rt).asArray(rt);
  const auto transformsCount = transformsArray.size(rt);

  TransformOperations transformOperations;
  transformOperations.reserve(transformsCount);

  for (size_t i = 0; i < transformsCount; ++i) {
    const auto transform = transformsArray.getValueAtIndex(rt, i);
    transformOperations.emplace_back(
        TransformOperation::fromJSIValue(rt, transform));
  }
  return transformOperations;
}

} // namespace reanimated
